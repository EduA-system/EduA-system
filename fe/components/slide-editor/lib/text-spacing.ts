const MIN_LETTER_SPACING = -2;
const MAX_LETTER_SPACING = 5;

export function normalizedLetterSpacing(value: number | undefined): number {
  return Math.min(MAX_LETTER_SPACING, Math.max(MIN_LETTER_SPACING, value ?? 0));
}
