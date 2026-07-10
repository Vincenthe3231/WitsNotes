/** Truncates a pin's note to a short preview shown before it's expanded. */
export function formatPinPreview(text: string, maxLen = 40): string {
  const trimmed = text.trim();
  if (!trimmed) return "Empty note";
  return trimmed.length > maxLen ? `${trimmed.slice(0, maxLen - 1)}…` : trimmed;
}
