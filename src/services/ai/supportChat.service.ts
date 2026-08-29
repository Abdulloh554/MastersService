import { readFileSync } from "fs";
import path from "path";
import { callAIJson, AIMessage } from "./client";
import logger from "../../config/logger";

export interface SupportHistoryItem {
  role: "user" | "assistant";
  content: string;
}

export interface SupportChatResult {
  reply: string;
}

function loadFaq(): string {
  try {
    const p = path.join(__dirname, "..", "..", "services", "ai", "knowledge", "faq.md");
    return readFileSync(p, "utf8");
  } catch {
    return "";
  }
}

/**
 * Produces a support chatbot reply grounded in the MasterService FAQ.
 * Falls back to a canned, helpful reply when AI is unavailable.
 */
export async function answerSupportQuestion(
  message: string,
  history: SupportHistoryItem[],
  language: string
): Promise<SupportChatResult> {
  const faq = loadFaq();
  const systemPrompt = `You are the MasterService in-app support assistant.
Answer ONLY using the official MasterService FAQ below. If the question is not
about MasterService platform features (e.g. politics, medicine, general advice),
politely say you can only help with MasterService topics.
Keep answers short, accurate and in language code "${language}".
Return ONLY a JSON object: {"reply": string}

FAQ:
${faq}`;

  const historyMessages: AIMessage[] = history
    .filter((h) => h.role === "assistant")
    .map((h) => ({ role: "assistant" as const, content: h.content }));
  const userMessages: AIMessage[] = history
    .filter((h) => h.role === "user")
    .slice(-1)
    .map((h) => ({ role: "user" as const, content: h.content }));

  const FALLBACK_REPLY =
    "Kechirasiz, yordam xizmati hozircha ishlamayapti. Iltimos, keyinroq qayta urinib ko'ring yoki ilova ichidagi qo'llanmani o'qing. / Sorry, the support assistant is temporarily unavailable. Please try again later or read the in-app guide. / Извините, помощник временно недоступен. Попробуйте позже.";

  try {
    const result = await callAIJson<SupportChatResult>(
      systemPrompt,
      `[${language}] User message: ${message}`,
      { temperature: 0.3 },
      [...historyMessages, ...userMessages]
    );
    if (!result || !result.reply) {
      return { reply: FALLBACK_REPLY };
    }
    return result;
  } catch (error) {
    logger.warn({ err: error }, "support-chat AI unavailable, using fallback");
    return { reply: FALLBACK_REPLY };
  }
}
