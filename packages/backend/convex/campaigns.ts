import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { getWorkspaceIdForCurrentUser } from "./workspaces";
import { CAMPAIGN_TYPE, CAMPAIGN_STATUS, PLATFORM, PROVIDER } from "./lib/validators";

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
