export type NullableNumber = number | null;

/** Render a nullable number in a number input (empty string when null/undefined). */
export function formatNullableNumber(
  value: NullableNumber | undefined | string,
): string {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }
  return String(value);
}

/** Parse a number input value; empty input becomes null (never 0). */
export function parseNullableNumberFromInput(raw: string): NullableNumber {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Use only at calculation/submit boundaries when a numeric fallback is required. */
export function coalesceNumber(
  value: NullableNumber | undefined,
  fallback = 0,
): number {
  return value ?? fallback;
}
