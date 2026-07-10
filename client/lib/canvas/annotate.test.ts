import { describe, it, expect } from "vitest";
import { formatPinPreview } from "./annotate";

describe("formatPinPreview", () => {
  it("returns a placeholder for empty/whitespace-only text", () => {
    expect(formatPinPreview("")).toBe("Empty note");
    expect(formatPinPreview("   ")).toBe("Empty note");
  });

  it("returns short text unchanged", () => {
    expect(formatPinPreview("Check this later")).toBe("Check this later");
  });

  it("truncates long text with an ellipsis at the configured length", () => {
    const long = "a".repeat(60);
    const result = formatPinPreview(long, 40);
    expect(result.length).toBe(40);
    expect(result.endsWith("…")).toBe(true);
  });
});
