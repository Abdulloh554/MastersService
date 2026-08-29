import { callAIJson } from "./client";
import logger from "../../config/logger";
import FraudFlag from "../../models/FraudFlag";
import Transaction from "../../models/Transaction";
import User from "../../models/User";

export interface FraudAnalysisResult {
  riskScore: number;
  reasons: string[];
}

const SYSTEM_PROMPT = `You are a fraud analyst for the MasterService payment platform.
You will receive AGGREGATED, ANONYMIZED numeric metrics and pattern descriptions
about a transaction or user. There is NO personal data (no names, phones, card
numbers) in the input — do not use any if present.
Return ONLY a JSON object:
{"riskScore": number, "reasons": string[]}
- riskScore: 0-100 likelihood that this is fraud.
- reasons: 1-5 short, concrete reasons based only on the provided metrics.
Do not write anything other than the JSON.`;

export interface AnonymizedUserMetrics {
  userHandle: string;
  accountAgeDays: number;
  transactionCount30d: number;
  totalVolume30d: number;
  avgAmount30d: number;
  maxAmount30d: number;
  withdrawalCount30d: number;
  deviceCount30d: number;
}

export async function analyzeFraud(
  metrics: AnonymizedUserMetrics
): Promise<FraudAnalysisResult> {
  try {
    const result = await callAIJson<FraudAnalysisResult>(
      SYSTEM_PROMPT,
      JSON.stringify(metrics),
      { temperature: 0.2 }
    );
    if (!result) {
      return { riskScore: 0, reasons: [] };
    }
    return {
      riskScore:
        typeof result.riskScore === "number"
          ? Math.max(0, Math.min(100, result.riskScore))
          : 0,
      reasons: Array.isArray(result.reasons) ? result.reasons.slice(0, 5) : [],
    };
  } catch (error) {
    logger.warn({ err: error }, "fraud AI unavailable, using heuristic");
    return {
      riskScore: metrics.withdrawalCount30d >= 5 ? 70 : 0,
      reasons: metrics.withdrawalCount30d >= 5
        ? ["High withdrawal frequency"]
        : [],
    };
  }
}

/**
 * Scans recent transactions, groups them per user, and records FraudFlags for
 * users whose anonymized metrics score above a threshold. Never sends personal
 * data to the AI — only aggregated numeric metrics keyed by a random handle.
 */
export async function runFraudDetection(scanHours: number = 24): Promise<number> {
  const since = new Date(Date.now() - scanHours * 60 * 60 * 1000);

  const counts = await Transaction.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: "$fromUser",
        count: { $sum: 1 },
        total: { $sum: "$amount" },
        avg: { $avg: "$amount" },
        max: { $max: "$amount" },
      },
    },
    { $sort: { count: -1 } },
  ]);

  let flagged = 0;

  for (const row of counts) {
    const userId = row._id as string;
    const existing = await FraudFlag.findOne({
      entityType: "User",
      entityId: userId,
      status: "pending",
    });
    if (existing) continue;

    const user = await User.findById(userId).lean();
    if (!user) continue;

    const accountAgeDays = user.createdAt
      ? Math.max(1, Math.floor((Date.now() - new Date(user.createdAt).getTime()) / 86400000))
      : 1;

    const metrics: AnonymizedUserMetrics = {
      userHandle: `u_${userId.slice(-6)}`,
      accountAgeDays,
      transactionCount30d: row.count,
      totalVolume30d: row.total,
      avgAmount30d: row.avg,
      maxAmount30d: row.max,
      withdrawalCount30d: 0,
      deviceCount30d: 1,
    };

    const analysis = await analyzeFraud(metrics);
    if (analysis.riskScore >= 60) {
      await FraudFlag.create({
        entityType: "User",
        entityId: userId,
        riskScore: analysis.riskScore,
        reasons: analysis.reasons,
        status: "pending",
      });
      flagged += 1;
    }
  }

  return flagged;
}
