import { callAIJson } from "./client";
import logger from "../../config/logger";

export interface ProfileEnhanceResult {
  enhanced: {
    uz: string;
    ru: string;
    en: string;
  };
}

const SYSTEM_PROMPT = `You are a professional bio writer for the MasterService marketplace.
Rewrite the user's raw self-description into a professional, natural Master profile.
Return ONLY a JSON object with this exact shape:
{"enhanced": {"uz": string, "ru": string, "en": string}}
- Each value is the polished bio in that language (max 300 chars each).
- Keep an honest, professional tone.
- DO NOT add fabricated or unverifiable claims (e.g. "the best master", years of
  experience, certifications, or results that were not stated by the user).
- Preserve only the factual information the user provided, expressed more clearly.`;

/**
 * Produces a professional bio in all supported languages. Returns null when AI
 * is unavailable so the caller can let the user edit their raw text directly.
 */
export async function enhanceProfile(
  rawText: string,
  sourceLanguage: string
): Promise<ProfileEnhanceResult | null> {
  const userPrompt = `Source language: ${sourceLanguage}.
Raw user text:
${rawText}`;

  try {
    return await callAIJson<ProfileEnhanceResult>(SYSTEM_PROMPT, userPrompt, {
      temperature: 0.4,
    });
  } catch (error) {
    logger.warn({ err: error }, "profile-enhance AI unavailable, returning null");
    return null;
  }
}
