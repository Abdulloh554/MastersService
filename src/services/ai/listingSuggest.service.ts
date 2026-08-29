import Category from "../../models/Category";
import { callAIJson, AIContentBlock } from "./client";
import logger from "../../config/logger";

export interface ListingSuggestResult {
  categoryId: string;
  categoryConfidence: number;
  suggestedTitle: string;
  cleanedDescription: string;
  estimatedPriceRange: { min: number; max: number; currency: "UZS" };
}

interface ListingSuggestLLM extends Omit<ListingSuggestResult, "categoryId"> {
  categoryKey: string;
}

/**
 * Returns AI suggestions (category, title, cleaned description, price range)
 * for a user's ad/request text. Falls back to a neutral stub when AI is
 * unavailable so the flow still works (user picks manually).
 */
export async function suggestListing(
  description: string,
  imageUrl: string | undefined,
  language: string
): Promise<ListingSuggestResult | null> {
  const categories = await Category.find({ type: "ad", isActive: true }).lean();
  const categoryList = categories
    .map((c) => {
      const name = (c.name as any)?.[language] || c.name?.uz || c.name?.en;
      return `${c._id}: ${name}`;
    })
    .join("\n");

  const systemPrompt = `You are an assistant that helps classify service requests on the MasterService marketplace.
Choose exactly one category from the PROVIDED category list — never invent a new one.
Return ONLY a JSON object with this exact shape:
{"categoryKey": string, "categoryConfidence": number, "suggestedTitle": string, "cleanedDescription": string, "estimatedPriceRange": {"min": number, "max": number}}
- categoryKey: the id (prefix before ":") of the chosen category.
- categoryConfidence: 0-1 confidence in the category match.
- suggestedTitle: a short, clear title (max 60 chars).
- cleanedDescription: a polished version of the user's text (max 300 chars), in ${language}.
- estimatedPriceRange: plausible UZS price range (min < max) for this service.
Category list:
${categoryList}`;

  const content: AIContentBlock[] = [];
  if (imageUrl) {
    content.push({ type: "image_url", image_url: { url: imageUrl } });
  }
  content.push({ type: "text", text: description });

  let result: ListingSuggestLLM | null = null;
  try {
    result = await callAIJson<ListingSuggestLLM>(
      systemPrompt,
      "Analyze the following service request.",
      { temperature: 0.3 },
      [{ role: "user", content }]
    );
  } catch (error) {
    logger.warn({ err: error }, "listing-suggest AI unavailable, returning null");
    return null;
  }

  if (!result || !result.categoryKey) {
    return null;
  }

  return {
    categoryId: result.categoryKey,
    categoryConfidence: result.categoryConfidence,
    suggestedTitle: result.suggestedTitle,
    cleanedDescription: result.cleanedDescription,
    estimatedPriceRange: result.estimatedPriceRange,
  };
}
