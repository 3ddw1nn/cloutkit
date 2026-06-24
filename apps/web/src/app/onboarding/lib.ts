// Raw per-step onboarding answers are intentionally untyped on the backend
// (Convex's responsesJson: v.record(v.string(), v.any())), so step components
// read loosely-shaped data here too rather than fighting that boundary.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type StepAnswers = Record<string, any>;

export function parseLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function joinLines(values: string[] | undefined): string {
  return (values ?? []).join("\n");
}

export const BRAND_TYPES = [
  "PERSONAL_BRAND",
  "COMPANY",
  "PRODUCT",
  "CREATOR",
  "AGENCY",
  "COMMUNITY",
  "LOCAL_BUSINESS",
  "OTHER",
] as const;

export const TARGET_PLATFORMS = ["INSTAGRAM", "FACEBOOK", "X", "YOUTUBE"] as const;

export const TONE_OPTIONS = [
  "Professional",
  "Casual",
  "Funny",
  "Educational",
  "Bold",
  "Inspirational",
  "Technical",
  "Friendly",
  "Direct",
] as const;
