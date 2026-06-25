import { v } from "convex/values";

export const PLATFORM = v.union(
  v.literal("INSTAGRAM"),
  v.literal("FACEBOOK"),
  v.literal("X"),
  v.literal("YOUTUBE"),
  v.literal("LINKEDIN"),
  v.literal("TIKTOK"),
  v.literal("PRODUCT_HUNT"),
  v.literal("REDDIT"),
  v.literal("THREADS"),
  v.literal("BLUESKY"),
);

export const PROVIDER = v.union(
  v.literal("OPENAI"),
  v.literal("ANTHROPIC"),
  v.literal("OPENROUTER"),
  v.literal("GROQ"),
  v.literal("GOOGLE"),
  v.literal("OTHER"),
);

export const CAMPAIGN_TYPE = v.union(
  v.literal("APP_LAUNCH"),
  v.literal("PRODUCT_HUNT"),
  v.literal("TECH_DISCOVERY"),
  v.literal("PRODUCT_UPDATE"),
  v.literal("FOUNDER_UPDATE"),
  v.literal("BUILDING_IN_PUBLIC"),
  v.literal("EDUCATIONAL"),
  v.literal("ANNOUNCEMENT"),
  v.literal("GENERAL"),
);

export const CAMPAIGN_STATUS = v.union(
  v.literal("DRAFT"),
  v.literal("IDEA_GENERATED"),
  v.literal("IDEA_APPROVED"),
  v.literal("SEQUENCE_GENERATED"),
  v.literal("CONTENT_REVIEW"),
  v.literal("READY_TO_PUBLISH"),
  v.literal("SCHEDULED"),
  v.literal("PUBLISHING"),
  v.literal("PUBLISHED"),
  v.literal("ENGAGEMENT_GENERATED"),
  v.literal("ENGAGEMENT_REVIEW"),
  v.literal("COMPLETED"),
  v.literal("ARCHIVED"),
  v.literal("FAILED"),
);
