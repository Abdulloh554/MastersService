import Category from "../../models/Category";
import { callAIJson, AIContentBlock } from "./client";
import logger from "../../config/logger";

export interface ProductGenerateResult {
  descriptions: { uz: string; ru: string; en: string };
  suggestedTags: string[];
  categoryId: string;
}

interface ProductGenerateLLM {
  descriptions: { uz: string; ru: string; en: string };
  suggestedTags: string[];
  categoryKey: string;
}

/**
 * Generates multilingual product descriptions, tags and a category from the
 * product name and photos. Returns null when AI is unavailable so the seller
 * can fill the fields manually (fallback).
 */
export async function generateProduct(
  productName: string,
  imageUrls: string[],
  categoryHint: string | undefined
): Promise<ProductGenerateResult | null> {
  const categories = await Category.find({ type: "product", isActive: true }).lean();
  const categoryList = categories
    .map((c) => `${c._id}: ${c.name?.uz || c.name?.en}`)
    .join("\n");

  const systemPrompt = `You are a product copywriter for the MasterService marketplace.
Analyze the product photos and name, then write accurate, appealing product copy.
Return ONLY a JSON object with this exact shape:
{"descriptions": {"uz": string, "ru": string, "en": string},
 "suggestedTags": string[],
 "categoryKey": string}
- descriptions: a clear, factual description (max 250 chars each) in each language.
- suggestedTags: 3 to 8 short keywords describing the product.
- categoryKey: the id (prefix before ":") of the BEST matching category from the list below. Never invent a category.
Category list:
${categoryList}`;

  const content: AIContentBlock[] = imageUrls.map((url) => ({
    type: "image_url",
    image_url: { url },
  }));
  content.push({
    type: "text",
    text: `Product name: ${productName}${
      categoryHint ? `\nCategory hint: ${categoryHint}` : ""
    }`,
  });

  let result: ProductGenerateLLM | null = null;
  try {
    result = await callAIJson<ProductGenerateLLM>(
      systemPrompt,
      "Generate product copy for the shown product.",
      { temperature: 0.4, maxTokens: 1024 },
      [{ role: "user", content }]
    );
  } catch (error) {
    logger.warn({ err: error }, "product-generate AI unavailable, returning null");
    return null;
  }

  if (!result || !result.categoryKey) {
    return null;
  }

  return {
    descriptions: result.descriptions,
    suggestedTags: Array.isArray(result.suggestedTags)
      ? result.suggestedTags.slice(0, 8)
      : [],
    categoryId: result.categoryKey,
  };
}
