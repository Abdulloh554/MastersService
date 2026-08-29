import { config } from "../../config";
import { AppError } from "../../utils/AppError";
import logger from "../../config/logger";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1/chat/completions";

export interface AIContentBlock {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
}

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string | AIContentBlock[];
}

export interface AIOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

let keyIndex = 0;

/** Round-robin over configured Groq keys. */
function nextApiKey(): string {
  const keys = config.ai.groqApiKeys;
  if (keys.length === 0) {
    return "";
  }
  const key = keys[keyIndex % keys.length];
  keyIndex += 1;
  return key;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extracts a JSON object from an LLM completion, tolerating ```json fences
 * and surrounding prose. Falls back to a null if no valid JSON is found.
 */
export function parseJsonResponse<T>(raw: string): T | null {
  let text = raw.trim();

  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  }

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    text = text.slice(start, end + 1);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/**
 * Calls the Groq chat completions API. Automatically retries on transient
 * failures (429/5xx/network/timeout) and round-robins across configured keys.
 * Returns the raw content string of the first assistant message.
 *
 * If AI is not configured (no keys) this throws an AppError that callers can
 * catch to trigger their fallback path.
 */
export async function callAI(
  messages: AIMessage[],
  options: AIOptions = {}
): Promise<string> {
  if (!config.ai.enabled) {
    throw AppError.serviceUnavailable(
      "AI is not configured. Add GROQ_API_KEYS to enable AI features."
    );
  }

  const model = options.model || config.ai.model;
  const { maxRetries } = config.ai;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const apiKey = nextApiKey();
    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => controller.abort(), config.ai.timeoutMs);

    try {
      const response = await fetch(GROQ_BASE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options.temperature ?? 0.4,
          max_tokens: options.maxTokens ?? 1024,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text();
        lastError = new Error(`Groq API error ${response.status}: ${body}`);
        if (response.status === 429 || response.status >= 500) {
          // transient — retry
          await sleep(300 * (attempt + 1));
          continue;
        }
        throw lastError;
      }

      const data = (await response.json()) as any;
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== "string") {
        throw new Error("Groq API returned no content");
      }
      return content;
    } catch (error: any) {
      lastError = error;
      if (error?.name === "AbortError") {
        lastError = new Error("Groq API request timed out");
      }
      const retriable =
        error?.name === "AbortError" ||
        error?.type === "system" ||
        (error instanceof Error && error.name !== "AppError");
      if (attempt < maxRetries && retriable) {
        await sleep(300 * (attempt + 1));
        continue;
      }
      break;
    } finally {
      clearTimeout(timeoutTimer);
    }
  }

  throw AppError.aiServiceError(
    `AI request failed: ${lastError?.message || "unknown error"}`
  );
}

/**
 * Convenience wrapper that requests a structured JSON response and parses it.
 * Returns the parsed object, or null if the model did not return valid JSON.
 */
function hasImageContent(messages: AIMessage[]): boolean {
  return messages.some((m) =>
    Array.isArray(m.content)
      ? m.content.some((c) => c.type === "image_url")
      : false
  );
}

function stripImages(messages: AIMessage[]): AIMessage[] {
  return messages.map((m) => {
    if (Array.isArray(m.content)) {
      const textParts = m.content
        .filter((c) => c.type === "text")
        .map((c) => c.text || "")
        .filter(Boolean);
      return { role: m.role, content: textParts.join("\n") };
    }
    return m;
  });
}

/**
 * Convenience wrapper that requests a structured JSON response and parses it.
 * If the request carried image content and the model rejects it (no vision),
 * it transparently retries with a text-only prompt. Returns null if the model
 * did not return valid JSON.
 */
export async function callAIJson<T>(
  systemPrompt: string,
  userPrompt: string,
  options: AIOptions = {},
  messages: AIMessage[] = []
): Promise<T | null> {
  const fullMessages: AIMessage[] = [
    { role: "system", content: systemPrompt },
    ...messages,
    { role: "user", content: userPrompt },
  ];

  let raw: string | null = null;
  try {
    raw = await callAI(fullMessages, options);
  } catch (error: any) {
    if (!hasImageContent(fullMessages)) {
      throw error;
    }
    // Vision unsupported by the current model — retry text-only.
    const textOnly = stripImages(fullMessages);
    raw = await callAI(textOnly, { ...options, model: config.ai.model });
  }

  return parseJsonResponse<T>(raw!);
}
