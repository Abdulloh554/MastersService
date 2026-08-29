import { callAIJson } from "./client";
import logger from "../../config/logger";

export interface ReviewAnalysis {
  sentimentScore: number;
  isSuspicious: boolean;
  reasons: string[];
}

export interface ReviewAnalysisInput {
  text: string;
  rating: number;
  reviewCount: number;
  avgRating: number;
}

const SYSTEM_PROMPT = `You are a review-quality analyst for the MasterService marketplace.
Given a review and aggregate reviewer stats, classify its sentiment and whether
it is likely fake/spam.
Return ONLY a JSON object:
{"sentimentScore": number, "isSuspicious": boolean, "reasons": string[]}
- sentimentScore: -1 (very negative) to 1 (very positive).
- isSuspicious: true if the review looks fake/duplicate/repetitive/generic.
- reasons: short reasons if isSuspicious, else empty array.`;

/**
 * Analyzes a review's sentiment and suspiciousness. Returns sensible defaults
 * when AI is unavailable so review quality never blocks the flow.
 */
export async function analyzeReview(
  input: ReviewAnalysisInput
): Promise<ReviewAnalysis> {
  try {
    const result = await callAIJson<ReviewAnalysis>(
      SYSTEM_PROMPT,
      JSON.stringify(input),
      { temperature: 0.2 }
    );
    if (!result) {
      return { sentimentScore: 0, isSuspicious: false, reasons: [] };
    }
    return {
      sentimentScore: result.sentimentScore ?? 0,
      isSuspicious: Boolean(result.isSuspicious),
      reasons: Array.isArray(result.reasons) ? result.reasons : [],
    };
  } catch (error) {
    logger.warn({ err: error }, "review sentiment AI unavailable, using defaults");
    return { sentimentScore: 0, isSuspicious: false, reasons: [] };
  }
}
