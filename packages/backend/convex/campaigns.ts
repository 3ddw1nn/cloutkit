import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { getWorkspaceIdForCurrentUser } from "./workspaces";
import { CAMPAIGN_TYPE, CAMPAIGN_STATUS, PLATFORM, PROVIDER } from "./lib/validators";
import { logAudit } from "./lib/audit";

export const createCampaign = mutation({
  args: {
    title: v.string(),
    inputTopic: v.string(),
    objective: v.optional(v.string()),
    campaignType: CAMPAIGN_TYPE,
    selectedPlatforms: v.array(PLATFORM),
    optionalLinks: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const ids = await getWorkspaceIdForCurrentUser(ctx);
    if (ids === null) throw new Error("Not authenticated");

    return await ctx.db.insert("campaigns", {
      ...args,
      workspaceId: ids.workspaceId,
      createdById: ids.userId,
      status: "DRAFT",
    });
  },
});

export const getCampaigns = query({
  args: { status: v.optional(CAMPAIGN_STATUS) },
  handler: async (ctx, { status }) => {
    const ids = await getWorkspaceIdForCurrentUser(ctx);
    if (ids === null) return [];

    const rows = await ctx.db
      .query("campaigns")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", ids.workspaceId))
      .order("desc")
      .collect();

    return status ? rows.filter((row) => row.status === status) : rows;
  },
});

export const getCampaignById = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, { campaignId }) => {
    const ids = await getWorkspaceIdForCurrentUser(ctx);
    if (ids === null) return null;

    const campaign = await ctx.db.get("campaigns", campaignId);
    if (campaign === null || campaign.workspaceId !== ids.workspaceId) return null;

    const idea = await ctx.db
      .query("campaignIdeas")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", campaignId))
      .unique();

    return { campaign, idea };
  },
});

// Internal-only: for use by scheduled/internal actions that have no caller
// identity to resolve a workspace from (e.g. postPublishActions.ts).
export const getCampaignByIdInternal = internalQuery({
  args: { campaignId: v.id("campaigns"), workspaceId: v.id("workspaces") },
  handler: async (ctx, { campaignId, workspaceId }) => {
    const campaign = await ctx.db.get("campaigns", campaignId);
    if (campaign === null || campaign.workspaceId !== workspaceId) return null;
    return campaign;
  },
});

export const approveCampaignIdea = mutation({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, { campaignId }) => {
    const ids = await getWorkspaceIdForCurrentUser(ctx);
    if (ids === null) throw new Error("Not authenticated");

    const campaign = await ctx.db.get("campaigns", campaignId);
    if (campaign === null || campaign.workspaceId !== ids.workspaceId) {
      throw new Error("Campaign not found");
    }

    const idea = await ctx.db
      .query("campaignIdeas")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", campaignId))
      .unique();
    if (idea === null) throw new Error("No idea to approve");

    await ctx.db.patch("campaignIdeas", idea._id, { approved: true, approvedAt: Date.now() });
    await ctx.db.patch("campaigns", campaignId, { status: "IDEA_APPROVED" });
  },
});

export const updateCampaignIdea = mutation({
  args: {
    campaignId: v.id("campaigns"),
    mainAngle: v.optional(v.string()),
    keyMessage: v.optional(v.string()),
    contentDirection: v.optional(v.string()),
  },
  handler: async (ctx, { campaignId, ...patch }) => {
    const ids = await getWorkspaceIdForCurrentUser(ctx);
    if (ids === null) throw new Error("Not authenticated");

    const idea = await ctx.db
      .query("campaignIdeas")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", campaignId))
      .unique();
    if (idea === null || idea.workspaceId !== ids.workspaceId) {
      throw new Error("Idea not found");
    }

    await ctx.db.patch("campaignIdeas", idea._id, patch);
  },
});

// Internal-only: called from convex/campaignActions.ts after a successful
// generation, never exposed to the public API surface directly.
export const saveCampaignIdea = internalMutation({
  args: {
    campaignId: v.id("campaigns"),
    workspaceId: v.id("workspaces"),
    provider: PROVIDER,
    model: v.string(),
    idea: v.object({
      mainAngle: v.string(),
      targetAudience: v.string(),
      tone: v.string(),
      keyMessage: v.string(),
      platformStrategyJson: v.any(),
      contentDirection: v.string(),
      engagementStrategy: v.string(),
      recommendedSequenceJson: v.any(),
      rawAiOutput: v.string(),
    }),
    usage: v.object({
      promptTokens: v.number(),
      completionTokens: v.number(),
      totalTokens: v.number(),
    }),
    estimatedCost: v.number(),
  },
  handler: async (ctx, { campaignId, workspaceId, provider, model, idea, usage, estimatedCost }) => {
    const existing = await ctx.db
      .query("campaignIdeas")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", campaignId))
      .unique();

    const fields = { campaignId, workspaceId, ...idea, approved: false, approvedAt: undefined };
    if (existing !== null) {
      await ctx.db.patch("campaignIdeas", existing._id, fields);
    } else {
      await ctx.db.insert("campaignIdeas", fields);
    }

    await ctx.db.patch("campaigns", campaignId, { status: "IDEA_GENERATED" });

    await ctx.db.insert("apiUsageLogs", {
      workspaceId,
      provider,
      model,
      feature: "CAMPAIGN_IDEA",
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      estimatedCost,
    });
  },
});

export const scheduleCampaignPublish = mutation({
  args: { campaignId: v.id("campaigns"), scheduledFor: v.number() },
  handler: async (ctx, { campaignId, scheduledFor }) => {
    const ids = await getWorkspaceIdForCurrentUser(ctx);
    if (ids === null) throw new Error("Not authenticated");

    const campaign = await ctx.db.get("campaigns", campaignId);
    if (campaign === null || campaign.workspaceId !== ids.workspaceId) {
      throw new Error("Campaign not found");
    }

    if (campaign.status !== "READY_TO_PUBLISH") {
      throw new Error(
        `Campaign must be READY_TO_PUBLISH to schedule (current: ${campaign.status})`,
      );
    }

    if (scheduledFor <= Date.now()) {
      throw new Error("Scheduled time must be in the future");
    }

    const scheduledFunctionId = await ctx.scheduler.runAt(
      scheduledFor,
      internal.postPublishActions.publishScheduledCampaign,
      { campaignId, workspaceId: ids.workspaceId, userId: ids.userId },
    );

    await ctx.db.patch("campaigns", campaignId, {
      status: "SCHEDULED",
      scheduledFor,
      scheduledFunctionId,
    });

    await logAudit(ctx, {
      workspaceId: ids.workspaceId,
      userId: ids.userId,
      action: "CAMPAIGN_SCHEDULED",
      entityType: "campaigns",
      entityId: campaignId,
      metadataJson: { scheduledFor },
    });
  },
});

export const cancelScheduledPublish = mutation({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, { campaignId }) => {
    const ids = await getWorkspaceIdForCurrentUser(ctx);
    if (ids === null) throw new Error("Not authenticated");

    const campaign = await ctx.db.get("campaigns", campaignId);
    if (campaign === null || campaign.workspaceId !== ids.workspaceId) {
      throw new Error("Campaign not found");
    }

    if (campaign.status !== "SCHEDULED") {
      throw new Error(`Campaign is not scheduled (current: ${campaign.status})`);
    }

    if (campaign.scheduledFunctionId) {
      await ctx.scheduler.cancel(campaign.scheduledFunctionId);
    }

    await ctx.db.patch("campaigns", campaignId, {
      status: "READY_TO_PUBLISH",
      scheduledFor: undefined,
      scheduledFunctionId: undefined,
    });

    await logAudit(ctx, {
      workspaceId: ids.workspaceId,
      userId: ids.userId,
      action: "CAMPAIGN_SCHEDULE_CANCELLED",
      entityType: "campaigns",
      entityId: campaignId,
    });
  },
});

export const getCalendarEntries = query({
  args: {},
  handler: async (ctx) => {
    const ids = await getWorkspaceIdForCurrentUser(ctx);
    if (ids === null) return [];

    const campaigns = await ctx.db
      .query("campaigns")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", ids.workspaceId))
      .collect();

    const relevant = campaigns.filter(
      (c) =>
        c.status === "SCHEDULED" ||
        c.status === "PUBLISHED" ||
        c.status === "ENGAGEMENT_REVIEW" ||
        c.status === "COMPLETED",
    );

    const entries = await Promise.all(
      relevant.map(async (campaign) => {
        let date: number | undefined;

        if (campaign.status === "SCHEDULED") {
          date = campaign.scheduledFor;
        } else {
          const posts = await ctx.db
            .query("posts")
            .withIndex("by_campaignId", (q) => q.eq("campaignId", campaign._id))
            .collect();
          const publishedDates = posts
            .map((p) => p.publishedAt)
            .filter((d): d is number => d !== undefined);
          date = publishedDates.length > 0 ? Math.min(...publishedDates) : undefined;
        }

        if (date === undefined) return null;

        return {
          campaignId: campaign._id,
          title: campaign.title,
          platforms: campaign.selectedPlatforms,
          status: campaign.status === "SCHEDULED" ? "SCHEDULED" : "PUBLISHED",
          date,
        };
      }),
    );

    return entries.filter((e): e is NonNullable<typeof e> => e !== null);
  },
});
