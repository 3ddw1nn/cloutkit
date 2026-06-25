import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { getWorkspaceIdForCurrentUser } from "./workspaces";
import { logAudit } from "./lib/audit";
import { ENGAGEMENT_ACTION_TYPE, ENGAGEMENT_SOURCE, TARGET_TYPE } from "./lib/validators";

export const getEngagementWaveForCampaign = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, { campaignId }) => {
    const ids = await getWorkspaceIdForCurrentUser(ctx);
    if (ids === null) return null;

    const wave = await ctx.db
      .query("engagementWaves")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", campaignId))
      .unique();
    if (wave === null) return null;

    const opportunities = await ctx.db
      .query("engagementOpportunities")
      .withIndex("by_waveId", (q) => q.eq("waveId", wave._id))
      .order("asc")
      .collect();

    return { wave, opportunities };
  },
});

export const getRoutineOpportunities = query({
  args: {},
  handler: async (ctx) => {
    const ids = await getWorkspaceIdForCurrentUser(ctx);
    if (ids === null) return [];

    return await ctx.db
      .query("engagementOpportunities")
      .withIndex("by_workspaceId", (q) =>
        q.eq("workspaceId", ids.workspaceId),
      )
      .filter((q) => q.eq(q.field("source"), "ROUTINE"))
      .order("desc")
      .collect();
  },
});

export const getRoutineSettings = query({
  args: {},
  handler: async (ctx) => {
    const ids = await getWorkspaceIdForCurrentUser(ctx);
    if (ids === null) return null;

    return await ctx.db
      .query("engagementRoutineSettings")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", ids.workspaceId))
      .unique();
  },
});

export const updateRoutineSettings = mutation({
  args: {
    enabled: v.optional(v.boolean()),
    commentsPerDay: v.optional(v.number()),
    likesPerDay: v.optional(v.number()),
    followsPerDay: v.optional(v.number()),
    repliesPerDay: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const ids = await getWorkspaceIdForCurrentUser(ctx);
    if (ids === null) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("engagementRoutineSettings")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", ids.workspaceId))
      .unique();

    const patch: Record<string, unknown> = {};
    if (args.enabled !== undefined) patch.enabled = args.enabled;
    if (args.commentsPerDay !== undefined) patch.commentsPerDay = args.commentsPerDay;
    if (args.likesPerDay !== undefined) patch.likesPerDay = args.likesPerDay;
    if (args.followsPerDay !== undefined) patch.followsPerDay = args.followsPerDay;
    if (args.repliesPerDay !== undefined) patch.repliesPerDay = args.repliesPerDay;

    if (existing) {
      await ctx.db.patch("engagementRoutineSettings", existing._id, patch);
    } else {
      await ctx.db.insert("engagementRoutineSettings", {
        workspaceId: ids.workspaceId,
        enabled: args.enabled ?? true,
        commentsPerDay: args.commentsPerDay ?? 5,
        likesPerDay: args.likesPerDay ?? 5,
        followsPerDay: args.followsPerDay ?? 5,
        repliesPerDay: args.repliesPerDay ?? 5,
      });
    }

    await logAudit(ctx, {
      workspaceId: ids.workspaceId,
      userId: ids.userId,
      action: "ROUTINE_SETTINGS_UPDATED",
      entityType: "engagementRoutineSettings",
    });
  },
});

export const approveOpportunity = mutation({
  args: { opportunityId: v.id("engagementOpportunities") },
  handler: async (ctx, { opportunityId }) => {
    const ids = await getWorkspaceIdForCurrentUser(ctx);
    if (ids === null) throw new Error("Not authenticated");

    const opportunity = await ctx.db.get("engagementOpportunities", opportunityId);
    if (opportunity === null || opportunity.workspaceId !== ids.workspaceId) {
      throw new Error("Opportunity not found");
    }

    await ctx.db.patch("engagementOpportunities", opportunityId, {
      status: "APPROVED",
      reviewedAt: Date.now(),
    });

    if (opportunity.waveId) {
      const allOpps = await ctx.db
        .query("engagementOpportunities")
        .withIndex("by_waveId", (q) => q.eq("waveId", opportunity.waveId!))
        .collect();

      const allReviewed = allOpps.every((o) => o.status !== "PENDING");
      if (allReviewed) {
        const wave = await ctx.db.get("engagementWaves", opportunity.waveId);
        if (wave) {
          await ctx.db.patch("campaigns", wave.campaignId, { status: "COMPLETED" });
        }
      }
    }

    await logAudit(ctx, {
      workspaceId: ids.workspaceId,
      userId: ids.userId,
      action: "OPPORTUNITY_APPROVED",
      entityType: "engagementOpportunities",
      entityId: opportunityId,
    });
  },
});

export const rejectOpportunity = mutation({
  args: { opportunityId: v.id("engagementOpportunities") },
  handler: async (ctx, { opportunityId }) => {
    const ids = await getWorkspaceIdForCurrentUser(ctx);
    if (ids === null) throw new Error("Not authenticated");

    const opportunity = await ctx.db.get("engagementOpportunities", opportunityId);
    if (opportunity === null || opportunity.workspaceId !== ids.workspaceId) {
      throw new Error("Opportunity not found");
    }

    await ctx.db.patch("engagementOpportunities", opportunityId, {
      status: "REJECTED",
      reviewedAt: Date.now(),
    });

    if (opportunity.waveId) {
      const allOpps = await ctx.db
        .query("engagementOpportunities")
        .withIndex("by_waveId", (q) => q.eq("waveId", opportunity.waveId!))
        .collect();

      const allReviewed = allOpps.every((o) => o.status !== "PENDING");
      if (allReviewed) {
        const wave = await ctx.db.get("engagementWaves", opportunity.waveId);
        if (wave) {
          await ctx.db.patch("campaigns", wave.campaignId, { status: "COMPLETED" });
        }
      }
    }

    await logAudit(ctx, {
      workspaceId: ids.workspaceId,
      userId: ids.userId,
      action: "OPPORTUNITY_REJECTED",
      entityType: "engagementOpportunities",
      entityId: opportunityId,
    });
  },
});

export const updateOpportunityText = mutation({
  args: { opportunityId: v.id("engagementOpportunities"), proposedText: v.string() },
  handler: async (ctx, { opportunityId, proposedText }) => {
    const ids = await getWorkspaceIdForCurrentUser(ctx);
    if (ids === null) throw new Error("Not authenticated");

    const opportunity = await ctx.db.get("engagementOpportunities", opportunityId);
    if (opportunity === null || opportunity.workspaceId !== ids.workspaceId) {
      throw new Error("Opportunity not found");
    }

    await ctx.db.patch("engagementOpportunities", opportunityId, { proposedText });

    await logAudit(ctx, {
      workspaceId: ids.workspaceId,
      userId: ids.userId,
      action: "OPPORTUNITY_TEXT_UPDATED",
      entityType: "engagementOpportunities",
      entityId: opportunityId,
    });
  },
});

export const saveEngagementWave = internalMutation({
  args: {
    campaignId: v.id("campaigns"),
    workspaceId: v.id("workspaces"),
    provider: v.string(),
    model: v.string(),
    dayDate: v.string(),
    dayType: v.string(),
    opportunities: v.array(
      v.object({
        platform: v.string(),
        actionType: v.string(),
        targetType: v.string(),
        targetHandle: v.string(),
        targetFollowerCount: v.optional(v.number()),
        targetPostSnippet: v.optional(v.string()),
        proposedText: v.optional(v.string()),
        scheduledTime: v.string(),
      }),
    ),
    rawAiOutput: v.string(),
    usage: v.object({
      promptTokens: v.number(),
      completionTokens: v.number(),
      totalTokens: v.number(),
    }),
    estimatedCost: v.number(),
  },
  handler: async (
    ctx,
    {
      campaignId,
      workspaceId,
      provider,
      model,
      dayDate,
      dayType,
      opportunities,
      rawAiOutput,
      usage,
      estimatedCost,
    },
  ) => {
    const waveId = await ctx.db.insert("engagementWaves", {
      campaignId,
      workspaceId,
      dayDate,
      dayType: dayType as any,
      generatedAt: Date.now(),
      rawAiOutput,
    });

    for (const opp of opportunities) {
      const [hours, minutes] = opp.scheduledTime.split(":").map(Number);
      const scheduled = new Date(dayDate);
      scheduled.setHours(hours, minutes, 0, 0);

      await ctx.db.insert("engagementOpportunities", {
        workspaceId,
        source: "CAMPAIGN_WAVE",
        waveId,
        campaignId,
        platform: opp.platform as any,
        actionType: opp.actionType as any,
        targetType: opp.targetType as any,
        targetHandle: opp.targetHandle,
        targetFollowerCount: opp.targetFollowerCount,
        targetPostSnippet: opp.targetPostSnippet,
        proposedText: opp.proposedText,
        scheduledFor: scheduled.getTime(),
        status: "PENDING",
      });
    }

    await ctx.db.patch("campaigns", campaignId, { status: "ENGAGEMENT_REVIEW" });

    await ctx.db.insert("apiUsageLogs", {
      workspaceId,
      provider: provider as any,
      model,
      feature: "ENGAGEMENT_WAVE",
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      estimatedCost,
    });
  },
});

export const saveRoutineQueue = internalMutation({
  args: {
    workspaceId: v.id("workspaces"),
    provider: v.string(),
    model: v.string(),
    opportunities: v.array(
      v.object({
        platform: v.string(),
        actionType: v.string(),
        targetType: v.string(),
        targetHandle: v.string(),
        targetFollowerCount: v.optional(v.number()),
        targetPostSnippet: v.optional(v.string()),
        proposedText: v.optional(v.string()),
        scheduledTime: v.string(),
      }),
    ),
    usage: v.object({
      promptTokens: v.number(),
      completionTokens: v.number(),
      totalTokens: v.number(),
    }),
    estimatedCost: v.number(),
  },
  handler: async (
    ctx,
    { workspaceId, provider, model, opportunities, usage, estimatedCost },
  ) => {
    const today = new Date();
    const dayDate = today.toISOString().split("T")[0];

    for (const opp of opportunities) {
      const [hours, minutes] = opp.scheduledTime.split(":").map(Number);
      const scheduled = new Date(dayDate);
      scheduled.setHours(hours, minutes, 0, 0);

      await ctx.db.insert("engagementOpportunities", {
        workspaceId,
        source: "ROUTINE",
        platform: opp.platform as any,
        actionType: opp.actionType as any,
        targetType: opp.targetType as any,
        targetHandle: opp.targetHandle,
        targetFollowerCount: opp.targetFollowerCount,
        targetPostSnippet: opp.targetPostSnippet,
        proposedText: opp.proposedText,
        scheduledFor: scheduled.getTime(),
        status: "PENDING",
      });
    }

    await ctx.db.insert("apiUsageLogs", {
      workspaceId,
      provider: provider as any,
      model,
      feature: "ENGAGEMENT_WAVE",
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      estimatedCost,
    });
  },
});
