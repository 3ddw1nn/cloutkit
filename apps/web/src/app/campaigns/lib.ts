export const TARGET_PLATFORMS = ["INSTAGRAM", "FACEBOOK", "X", "YOUTUBE"] as const;

export const CAMPAIGN_TYPES = [
  "APP_LAUNCH",
  "PRODUCT_HUNT",
  "TECH_DISCOVERY",
  "PRODUCT_UPDATE",
  "FOUNDER_UPDATE",
  "BUILDING_IN_PUBLIC",
  "EDUCATIONAL",
  "ANNOUNCEMENT",
  "GENERAL",
] as const;

export const CAMPAIGN_STATUSES = [
  "DRAFT",
  "IDEA_GENERATED",
  "IDEA_APPROVED",
  "SEQUENCE_GENERATED",
  "CONTENT_REVIEW",
  "READY_TO_PUBLISH",
  "SCHEDULED",
  "PUBLISHING",
  "PUBLISHED",
  "ENGAGEMENT_GENERATED",
  "ENGAGEMENT_REVIEW",
  "COMPLETED",
  "ARCHIVED",
  "FAILED",
] as const;

export function formatEnumLabel(value: string): string {
  return value
    .split("_")
    .map((word) => word[0] + word.slice(1).toLowerCase())
    .join(" ");
}
