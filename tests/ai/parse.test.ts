import { describe, it, expect } from "vitest";
import { parseJsonResponse } from "../../src/services/ai/client";

describe("parseJsonResponse", () => {
  it("parses a plain JSON object", () => {
    expect(parseJsonResponse('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips ```json fences", () => {
    expect(parseJsonResponse('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("strips surrounding prose", () => {
    expect(parseJsonResponse('Here you go: {"a":1} thanks!')).toEqual({ a: 1 });
  });

  it("returns null on invalid JSON", () => {
    expect(parseJsonResponse("not json")).toBeNull();
  });
});
