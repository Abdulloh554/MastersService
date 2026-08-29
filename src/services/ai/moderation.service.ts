import { callAIJson, AIContentBlock } from "./client";
import ModerationQueue from "../../models/ModerationQueue";
import logger from "../../config/logger";

export interface ModerationResult {
  isSafe: boolean;
  categories: string[];
  confidence: number;
}

const SYSTEM_PROMPT = `You are a content moderation classifier for the MasterService marketplace.
Classify the given user-generated content and return ONLY a JSON object with this exact shape:
{"isSafe": boolean, "categories": string[], "confidence": number}

- "isSafe": true if the content is appropriate and allowed; false if it is harmful or forbidden.
- "categories": list of matched categories from: ["hate_speech", "violence", "sexual_content", "spam", "scam_fraud", "illegal_activity", "personal_data_leak", "inappropriate_image", "self_harm"]. Empty array if safe.
- "confidence": number from 0 to 1 indicating your confidence in the classification.
Do not write anything other than the JSON object.`;

interface ModerateLLMResult {
  isSafe: boolean;
  categories: string[];
  confidence: number;
}

/**
 * Moderates text (and optionally an image). Falls back to a safe result when
 * AI is unavailable so content is never hard-blocked by an outage.
 */
export async function moderateContent(
  text: string,
  imageUrl?: string
): Promise<ModerationResult> {
  const content: AIContentBlock[] = [];
  if (imageUrl) {
    content.push({ type: "image_url", image_url: { url: imageUrl } });
  }
  content.push({ type: "text", text });

  let result: ModerateLLMResult | null = null;
  try {
    result = await callAIJson<ModerateLLMResult>(
      SYSTEM_PROMPT,
      "Classify this content.",
      { temperature: 0 },
      [
        {
          role: "user",
          content,
        },
      ]
    );
  } catch (error) {
    logger.warn({ err: error }, "Moderation AI unavailable, allowing content");
  }

  if (
    !result ||
    typeof result.isSafe !== "boolean" ||
    typeof result.confidence !== "number"
  ) {
    return { isSafe: true, categories: [], confidence: 1 };
  }

  return {
    isSafe: result.isSafe,
    categories: Array.isArray(result.categories) ? result.categories : [],
    confidence: result.confidence,
  };
}

export interface QueueEntry {
  entityType: "Ad" | "Product" | "Review";
  entityId: string;
  result: ModerationResult;
}

/** Records a moderate-confidence content item into the admin review queue. */
export async function enqueueModeration(entry: QueueEntry): Promise<void> {
  if (entry.result.isSafe) return;
  try {
    await ModerationQueue.create({
      entityType: entry.entityType,
      entityId: entry.entityId,
      moderationResult: entry.result,
      status: "pending",
    });
  } catch (error) {
    logger.warn({ err: error }, "Failed to enqueue moderation item");
  }
}
