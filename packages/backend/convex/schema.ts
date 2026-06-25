import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  PLATFORM,
  PROVIDER,
  CAMPAIGN_TYPE,
  CAMPAIGN_STATUS,
  ENGAGEMENT_ACTION_TYPE,
  DAY_TYPE,
  ENGAGEMENT_SOURCE,
  TARGET_TYPE,
  ENGAGEMENT_OPPORTUNITY_STATUS,
} from "./lib/validators";

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
    platform: PLATFORM,
    enabled: v.boolean(),
    goal: v.optional(v.string()),
    contentTypes: v.optional(v.array(v.string())),
    postingFrequency: v.optional(v.string()),
    stylePreference: v.optional(v.string()),
  }).index("by_workspaceId", ["workspaceId"]),

  userApiKeys: defineTable({
    workspaceId: v.id("workspaces"),
    provider: PROVIDER,
    // AES-256-GCM via Web Crypto; the auth tag is embedded in `ciphertext`
    // (Web Crypto's AES-GCM output appends it, unlike Node's crypto module
    // which exposes it separately).
    encryptedKey: v.object({
      iv: v.string(),
      ciphertext: v.string(),
    }),
    keyPreview: v.string(),
    status: v.union(
      v.literal("ACTIVE"),
      v.literal("INVALID"),
      v.literal("DISABLED"),
      v.literal("DELETED"),
    ),
    lastTestedAt: v.optional(v.number()),
  })
    .index("by_workspaceId", ["workspaceId"])
    .index("by_workspaceId_and_provider", ["workspaceId", "provider"]),

  aiProviderSettings: defineTable({
    workspaceId: v.id("workspaces"),
    activeProvider: PROVIDER,
    model: v.string(),
    maxTokensPerGeneration: v.optional(v.number()),
    monthlyTokenLimit: v.optional(v.number()),
  }).index("by_workspaceId", ["workspaceId"]),

  auditLogs: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    action: v.string(),
    entityType: v.optional(v.string()),
    entityId: v.optional(v.string()),
    metadataJson: v.optional(v.any()),
  }).index("by_workspaceId", ["workspaceId"]),

  campaigns: defineTable({
    workspaceId: v.id("workspaces"),
    createdById: v.id("users"),
    title: v.string(),
    inputTopic: v.string(),
    objective: v.optional(v.string()),
    campaignType: CAMPAIGN_TYPE,
    status: CAMPAIGN_STATUS,
    selectedPlatforms: v.array(PLATFORM),
    optionalLinks: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    scheduledFor: v.optional(v.number()),
    scheduledFunctionId: v.optional(v.id("_scheduled_functions")),
  }).index("by_workspaceId", ["workspaceId"]),

  campaignIdeas: defineTable({
    campaignId: v.id("campaigns"),
    workspaceId: v.id("workspaces"),
    mainAngle: v.string(),
    targetAudience: v.string(),
    tone: v.string(),
    keyMessage: v.string(),
    platformStrategyJson: v.any(),
    contentDirection: v.string(),
    engagementStrategy: v.string(),
    recommendedSequenceJson: v.any(),
    rawAiOutput: v.string(),
    approved: v.boolean(),
    approvedAt: v.optional(v.number()),
  })
    .index("by_campaignId", ["campaignId"])
    .index("by_workspaceId", ["workspaceId"]),

  apiUsageLogs: defineTable({
    workspaceId: v.id("workspaces"),
    provider: PROVIDER,
    model: v.string(),
    feature: v.union(
      v.literal("CAMPAIGN_IDEA"),
      v.literal("FULL_SEQUENCE"),
      v.literal("POST_REGENERATION"),
      v.literal("ENGAGEMENT_WAVE"),
      v.literal("BRAND_PROFILE_GENERATION"),
      v.literal("POST_IMAGE_GENERATION"),
    ),
    promptTokens: v.optional(v.number()),
    completionTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
    estimatedCost: v.number(),
  }).index("by_workspaceId", ["workspaceId"]),

  posts: defineTable({
    campaignId: v.id("campaigns"),
    workspaceId: v.id("workspaces"),
    platform: PLATFORM,
    contentType: v.string(),
    sequenceOrder: v.number(),
    content: v.string(),
    mediaDescription: v.optional(v.string()),
    mediaStorageId: v.optional(v.id("_storage")),
    status: v.union(v.literal("DRAFT"), v.literal("APPROVED"), v.literal("REJECTED")),
    rawAiOutput: v.string(),
    publishedAt: v.optional(v.number()),
    mockPlatformPostId: v.optional(v.string()),
    mockPublishedUrl: v.optional(v.string()),
    publishMethod: v.optional(v.union(v.literal("MOCK"), v.literal("REAL"))),
  })
    .index("by_campaignId", ["campaignId"])
    .index("by_workspaceId", ["workspaceId"]),

  socialConnections: defineTable({
    workspaceId: v.id("workspaces"),
    platform: PLATFORM,
    encryptedCredentials: v.object({
      iv: v.string(),
      ciphertext: v.string(),
    }),
    accountHandle: v.optional(v.string()),
    status: v.union(
      v.literal("ACTIVE"),
      v.literal("INVALID"),
      v.literal("DISABLED"),
      v.literal("DELETED"),
    ),
    lastTestedAt: v.optional(v.number()),
  })
    .index("by_workspaceId", ["workspaceId"])
    .index("by_workspaceId_and_platform", ["workspaceId", "platform"]),

  postMetrics: defineTable({
    postId: v.id("posts"),
    workspaceId: v.id("workspaces"),
    platform: PLATFORM,
    likes: v.optional(v.number()),
    comments: v.optional(v.number()),
    shares: v.optional(v.number()),
    views: v.optional(v.number()),
    fetchedAt: v.number(),
  })
    .index("by_postId", ["postId"])
    .index("by_workspaceId", ["workspaceId"]),

  engagementWaves: defineTable({
    campaignId: v.id("campaigns"),
    workspaceId: v.id("workspaces"),
    dayDate: v.string(),
    dayType: DAY_TYPE,
    generatedAt: v.number(),
    rawAiOutput: v.string(),
  })
    .index("by_campaignId", ["campaignId"])
    .index("by_workspaceId", ["workspaceId"]),

  engagementOpportunities: defineTable({
    workspaceId: v.id("workspaces"),
    source: ENGAGEMENT_SOURCE,
    waveId: v.optional(v.id("engagementWaves")),
    campaignId: v.optional(v.id("campaigns")),
    platform: PLATFORM,
    actionType: ENGAGEMENT_ACTION_TYPE,
    targetType: TARGET_TYPE,
    targetHandle: v.string(),
    targetFollowerCount: v.optional(v.number()),
    targetPostSnippet: v.optional(v.string()),
    proposedText: v.optional(v.string()),
    scheduledFor: v.number(),
    status: ENGAGEMENT_OPPORTUNITY_STATUS,
    reviewedAt: v.optional(v.number()),
  })
    .index("by_workspaceId", ["workspaceId"])
    .index("by_waveId", ["waveId"]),

  engagementRoutineSettings: defineTable({
    workspaceId: v.id("workspaces"),
    enabled: v.boolean(),
    commentsPerDay: v.number(),
    likesPerDay: v.number(),
    followsPerDay: v.number(),
    repliesPerDay: v.number(),
  }).index("by_workspaceId", ["workspaceId"]),
});
