import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { getWorkspaceIdForCurrentUser } from "./workspaces";
import { logAudit } from "./lib/audit";
import { PLATFORM } from "./lib/validators";

export const getPostsForCampaign = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, { campaignId }) => {
    const ids = await getWorkspaceIdForCurrentUser(ctx);
    if (ids === null) return [];

    return await ctx.db
      .query("posts")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", campaignId))
      .order("asc")
      .collect();
  },
});

export const getPostById = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const ids = await getWorkspaceIdForCurrentUser(ctx);
    if (ids === null) return null;

    const post = await ctx.db.get("posts", postId);
    if (post && post.workspaceId !== ids.workspaceId) return null;
    return post || null;
  },
});

export const approvePost = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const ids = await getWorkspaceIdForCurrentUser(ctx);
    if (ids === null) throw new Error("Not authenticated");

    const post = await ctx.db.get("posts", postId);
    if (post === null || post.workspaceId !== ids.workspaceId) {
      throw new Error("Post not found");
    }

    await ctx.db.patch("posts", postId, { status: "APPROVED" });

    // Check if all posts for this campaign are now approved
    const allPosts = await ctx.db
      .query("posts")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", post.campaignId))
      .collect();

    const allApproved = allPosts.every((p) => p.status === "APPROVED");
    if (allApproved) {
      await ctx.db.patch("campaigns", post.campaignId, { status: "READY_TO_PUBLISH" });
    }

    await logAudit(ctx, {
      workspaceId: ids.workspaceId,
      userId: ids.userId,
      action: "POST_APPROVED",
      entityType: "posts",
      entityId: postId,
    });
  },
});

export const rejectPost = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const ids = await getWorkspaceIdForCurrentUser(ctx);
    if (ids === null) throw new Error("Not authenticated");

    const post = await ctx.db.get("posts", postId);
    if (post === null || post.workspaceId !== ids.workspaceId) {
      throw new Error("Post not found");
    }

    await ctx.db.patch("posts", postId, { status: "REJECTED" });

    await logAudit(ctx, {
      workspaceId: ids.workspaceId,
      userId: ids.userId,
      action: "POST_REJECTED",
      entityType: "posts",
      entityId: postId,
    });
  },
});

export const updatePost = mutation({
  args: {
    postId: v.id("posts"),
    content: v.optional(v.string()),
    mediaDescription: v.optional(v.string()),
  },
  handler: async (ctx, { postId, content, mediaDescription }) => {
    const ids = await getWorkspaceIdForCurrentUser(ctx);
    if (ids === null) throw new Error("Not authenticated");

    const post = await ctx.db.get("posts", postId);
    if (post === null || post.workspaceId !== ids.workspaceId) {
      throw new Error("Post not found");
    }

    const patch: Record<string, unknown> = {};
    if (content !== undefined) patch.content = content;
    if (mediaDescription !== undefined) patch.mediaDescription = mediaDescription;

    await ctx.db.patch("posts", postId, patch);

    await logAudit(ctx, {
      workspaceId: ids.workspaceId,
      userId: ids.userId,
      action: "POST_UPDATED",
      entityType: "posts",
      entityId: postId,
    });
  },
});

// Internal-only: called from convex/postActions.ts after successful generation
export const savePostsForSequence = internalMutation({
  args: {
    campaignId: v.id("campaigns"),
    workspaceId: v.id("workspaces"),
    provider: v.string(),
    model: v.string(),
    posts: v.array(
      v.object({
        platform: PLATFORM,
        contentType: v.string(),
        sequenceOrder: v.number(),
        content: v.string(),
        mediaDescription: v.optional(v.string()),
        rawAiOutput: v.string(),
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
    { campaignId, workspaceId, provider, model, posts, usage, estimatedCost },
  ) => {
    // Insert all posts in one batch
    for (const post of posts) {
      await ctx.db.insert("posts", {
        campaignId,
        workspaceId,
        platform: post.platform,
        contentType: post.contentType,
        sequenceOrder: post.sequenceOrder,
        content: post.content,
        mediaDescription: post.mediaDescription,
        status: "DRAFT",
        rawAiOutput: post.rawAiOutput,
      });
    }

    // Set campaign to CONTENT_REVIEW
    await ctx.db.patch("campaigns", campaignId, { status: "CONTENT_REVIEW" });

    // Log API usage
    await ctx.db.insert("apiUsageLogs", {
      workspaceId,
      provider: provider as any,
      model,
      feature: "FULL_SEQUENCE",
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      estimatedCost,
    });
  },
});

// Internal-only: called from convex/postActions.ts after regenerating a single post
export const saveRegeneratedPost = internalMutation({
  args: {
    postId: v.id("posts"),
    workspaceId: v.id("workspaces"),
    provider: v.string(),
    model: v.string(),
    content: v.string(),
    mediaDescription: v.string(),
    usage: v.object({
      promptTokens: v.number(),
      completionTokens: v.number(),
      totalTokens: v.number(),
    }),
    estimatedCost: v.number(),
  },
  handler: async (
    ctx,
    { postId, workspaceId, provider, model, content, mediaDescription, usage, estimatedCost },
  ) => {
    await ctx.db.patch("posts", postId, { content, mediaDescription });

    await ctx.db.insert("apiUsageLogs", {
      workspaceId,
      provider: provider as any,
      model,
      feature: "POST_REGENERATION",
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      estimatedCost,
    });
  },
});

const MOCK_URL_TEMPLATES: Record<string, string> = {
  INSTAGRAM: "https://instagram.com/p/{id}",
  FACEBOOK: "https://facebook.com/posts/{id}",
  X: "https://x.com/i/status/{id}",
  YOUTUBE: "https://youtube.com/watch?v={id}",
};

export const completeCampaignPublish = internalMutation({
  args: {
    campaignId: v.id("campaigns"),
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    results: v.array(
      v.object({
        postId: v.id("posts"),
        success: v.boolean(),
        publishedAt: v.optional(v.number()),
        mockPlatformPostId: v.optional(v.string()),
        mockPublishedUrl: v.optional(v.string()),
        publishMethod: v.optional(v.union(v.literal("MOCK"), v.literal("REAL"))),
      }),
    ),
  },
  handler: async (ctx, { campaignId, workspaceId, userId, results }) => {
    const now = Date.now();

    for (const result of results) {
      if (result.success) {
        const patch: Record<string, unknown> = {
          publishedAt: result.publishedAt ?? now,
          mockPlatformPostId: result.mockPlatformPostId,
          mockPublishedUrl: result.mockPublishedUrl,
        };
        if (result.publishMethod) {
          patch.publishMethod = result.publishMethod;
        }
        await ctx.db.patch("posts", result.postId, patch);
      }
    }

    const allPublished = results.every((r) => r.success);
    if (allPublished) {
      await ctx.db.patch("campaigns", campaignId, { status: "PUBLISHED" });
    }

    await logAudit(ctx, {
      workspaceId,
      userId,
      action: "CAMPAIGN_PUBLISHED",
      entityType: "campaigns",
      entityId: campaignId,
    });
  },
});
