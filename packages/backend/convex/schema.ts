import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  // Extends Convex Auth's default users table with our own app-level fields.
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    onboardingCompleted: v.optional(v.boolean()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"]),

  workspaces: defineTable({
    name: v.string(),
    ownerId: v.id("users"),

    // Approval preferences (onboarding step 7). Default all to true at
    // completeOnboarding time: public/irreversible actions require approval.
    requireApprovalBeforePublishing: v.optional(v.boolean()),
    requireApprovalBeforeComments: v.optional(v.boolean()),
    requireApprovalBeforeFollows: v.optional(v.boolean()),
    requireApprovalBeforeLikes: v.optional(v.boolean()),
    requireApprovalBeforeReposts: v.optional(v.boolean()),
    allowSchedulingAfterApproval: v.optional(v.boolean()),
    allowAutoPublishScheduledApprovedPosts: v.optional(v.boolean()),
  }).index("by_ownerId", ["ownerId"]),

  workspaceMembers: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    role: v.union(
      v.literal("OWNER"),
      v.literal("ADMIN"),
      v.literal("MEMBER"),
      v.literal("VIEWER"),
    ),
  })
    .index("by_userId", ["userId"])
    .index("by_workspaceId", ["workspaceId"])
    .index("by_workspaceId_and_userId", ["workspaceId", "userId"]),

  onboardingResponses: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    currentStep: v.number(),
    completed: v.boolean(),
    // Keyed "step1".."step10"; loose by design, see plan notes.
    responsesJson: v.record(v.string(), v.any()),
  }).index("by_workspaceId", ["workspaceId"]),

  brandIdentities: defineTable({
    workspaceId: v.id("workspaces"),
    brandName: v.string(),
    brandType: v.union(
      v.literal("PERSONAL_BRAND"),
      v.literal("COMPANY"),
      v.literal("PRODUCT"),
      v.literal("CREATOR"),
      v.literal("AGENCY"),
      v.literal("COMMUNITY"),
      v.literal("LOCAL_BUSINESS"),
      v.literal("OTHER"),
    ),
    websiteUrl: v.optional(v.string()),
    shortBio: v.string(),
    industry: v.optional(v.string()),
    longDescription: v.optional(v.string()),
    mission: v.optional(v.string()),
    differentiation: v.optional(v.string()),
    productsServices: v.optional(v.string()),
    goals: v.optional(v.array(v.string())),
    targetAudience: v.optional(v.string()),
    audienceProblems: v.optional(v.array(v.string())),
    audienceInterests: v.optional(v.array(v.string())),
    audienceKnowledgeLevel: v.optional(v.string()),
    audienceLocation: v.optional(v.string()),
    tone: v.optional(v.array(v.string())),
    writingStyle: v.optional(v.string()),
    emojiPreference: v.optional(v.string()),
    humorLevel: v.optional(v.string()),
    formalityLevel: v.optional(v.string()),
    technicalDepth: v.optional(v.string()),
    personalVsCompanyVoice: v.optional(v.string()),
    contentTypes: v.optional(v.array(v.string())),
    topics: v.optional(v.array(v.string())),
    avoidedTopics: v.optional(v.array(v.string())),
    examplePosts: v.optional(v.array(v.string())),
    wordsToUse: v.optional(v.array(v.string())),
    wordsToAvoid: v.optional(v.array(v.string())),
    ctaPreferences: v.optional(v.array(v.string())),
  }).index("by_workspaceId", ["workspaceId"]),

  platformGoals: defineTable({
    workspaceId: v.id("workspaces"),
    platform: v.union(
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
    ),
    enabled: v.boolean(),
    goal: v.optional(v.string()),
    contentTypes: v.optional(v.array(v.string())),
    postingFrequency: v.optional(v.string()),
    stylePreference: v.optional(v.string()),
  }).index("by_workspaceId", ["workspaceId"]),
});
