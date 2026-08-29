import Transaction from "../../models/Transaction";
import User from "../../models/User";
import Ad from "../../models/Ad";
import Order from "../../models/Order";
import { callAIJson } from "./client";
import logger from "../../config/logger";

export interface Insight {
  text: string;
  trend: "up" | "down" | "neutral";
  metric: string;
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const cache = new Map<string, { at: number; data: Insight[] }>();

interface PeriodStats {
  revenue: number;
  transactionCount: number;
  newUsers: number;
  newAds: number;
  orders: number;
  categoryAds: Array<{ category: string; count: number }>;
}

async function collectStats(start: Date, end: Date): Promise<PeriodStats> {
  const match = { createdAt: { $gte: start, $lte: end } };

  const [revenueAgg, users, ads, orders, catAgg] = await Promise.all([
    Transaction.aggregate([
      { $match: { status: "completed", ...match } },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]),
    User.countDocuments(match),
    Ad.countDocuments(match),
    Order.countDocuments(match),
    Ad.aggregate([
      { $match: match },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),
  ]);

  return {
    revenue: revenueAgg[0]?.total ?? 0,
    transactionCount: revenueAgg[0]?.count ?? 0,
    newUsers: users,
    newAds: ads,
    orders,
    categoryAds: catAgg.map((c: any) => ({
      category: String(c._id),
      count: c.count,
    })),
  };
}

const SYSTEM_PROMPT = `You are a business analyst for the MasterService marketplace.
Given the aggregated platform statistics for a period and the change versus the
previous period, write 3 to 5 short, factual insights for an admin.
Return ONLY a JSON object with this shape:
{"insights": [{"text": string, "trend": "up"|"down"|"neutral", "metric": string}]}
- text: one concise sentence, no invented numbers beyond what is provided.
- trend: whether the metric improved or worsened.
- metric: which metric this insight is about (e.g. "revenue", "new_users", "new_ads").`;

/**
 * Generates natural-language insights from aggregated, anonymized stats.
 * Results are cached in-memory for 6 hours to limit AI spend. On AI failure,
 * returns an empty list (the admin UI just shows no summary card).
 */
export async function generateInsights(period: string): Promise<Insight[]> {
  const cacheKey = `insights:${period}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.data;
  }

  const now = new Date();
  let start: Date;
  let prevStart: Date;
  if (period === "day") {
    start = new Date(now.setHours(0, 0, 0, 0));
    prevStart = new Date(start.getTime() - 24 * 60 * 60 * 1000);
  } else if (period === "month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  } else if (period === "year") {
    start = new Date(now.getFullYear(), 0, 1);
    prevStart = new Date(now.getFullYear() - 1, 0, 1);
  } else {
    start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    prevStart = new Date(start.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  try {
    const [current, previous] = await Promise.all([
      collectStats(start, now),
      collectStats(prevStart, start),
    ]);

    const pct = (c: number, p: number) =>
      p > 0 ? Math.round(((c - p) / p) * 100) : c > 0 ? 100 : 0;

    const statsPayload = {
      period,
      current,
      previous,
      deltas: {
        revenueChangePct: pct(current.revenue, previous.revenue),
        transactionCountChangePct: pct(
          current.transactionCount,
          previous.transactionCount
        ),
        newUsersChangePct: pct(current.newUsers, previous.newUsers),
        newAdsChangePct: pct(current.newAds, previous.newAds),
        ordersChangePct: pct(current.orders, previous.orders),
      },
    };

    const result = await callAIJson<{ insights: Insight[] }>(
      SYSTEM_PROMPT,
      JSON.stringify(statsPayload),
      { temperature: 0.3 }
    );

    const insights = result?.insights?.length ? result.insights : [];
    cache.set(cacheKey, { at: Date.now(), data: insights });
    return insights;
  } catch (error) {
    logger.warn({ err: error }, "ai-insights failed, returning empty");
    return [];
  }
}
