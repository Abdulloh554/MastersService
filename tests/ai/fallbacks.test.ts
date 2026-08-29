import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../src/models/Transaction", () => ({
  default: { aggregate: () => Promise.resolve([]) },
}));
vi.mock("../../src/models/User", () => ({
  default: { countDocuments: () => Promise.resolve(0) },
}));
vi.mock("../../src/models/Ad", () => ({
  default: { countDocuments: () => Promise.resolve(0), aggregate: () => Promise.resolve([]) },
}));
vi.mock("../../src/models/Order", () => ({
  default: { countDocuments: () => Promise.resolve(0) },
}));

vi.mock("../../src/services/ai/client", () => ({
  callAI: vi.fn(),
  callAIJson: vi.fn(),
}));

import { callAIJson } from "../../src/services/ai/client";
import { moderateContent } from "../../src/services/ai/moderation.service";
import { analyzeReview } from "../../src/services/ai/reviewSentiment.service";
import { generateInsights } from "../../src/services/ai/insights.service";

const mockCallAIJson = callAIJson as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockCallAIJson.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("moderateContent fallback", () => {
  it("allows content (safe) when AI throws", async () => {
    mockCallAIJson.mockRejectedValue(new Error("AI down"));
    const result = await moderateContent("some text");
    expect(result.isSafe).toBe(true);
    expect(result.confidence).toBe(1);
  });

  it("detects unsafe high-confidence content", async () => {
    mockCallAIJson.mockResolvedValue({
      isSafe: false,
      categories: ["hate_speech"],
      confidence: 0.95,
    });
    const result = await moderateContent("bad content");
    expect(result.isSafe).toBe(false);
    expect(result.categories).toContain("hate_speech");
  });
});

describe("analyzeReview fallback", () => {
  it("returns safe defaults when AI throws", async () => {
    mockCallAIJson.mockRejectedValue(new Error("AI down"));
    const out = await analyzeReview({
      text: "ok",
      rating: 5,
      reviewCount: 1,
      avgRating: 5,
    });
    expect(out.isSuspicious).toBe(false);
    expect(out.sentimentScore).toBe(0);
  });
});

describe("generateInsights fallback", () => {
  it("returns an empty list when AI throws", async () => {
    mockCallAIJson.mockRejectedValue(new Error("AI down"));
    const out = await generateInsights("week");
    expect(out).toEqual([]);
  });
});
