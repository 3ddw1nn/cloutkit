import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { getWorkspaceIdForCurrentUser } from "./workspaces";
import { PLATFORM } from "./lib/validators";

export const getWorkspaceMetrics = query({
  args: {},
  handler: async (ctx) => {
    const ids = await getWorkspaceIdForCurrentUser(ctx);
    if (ids === null) return null;

    const posts = await ctx.db
      .query("posts")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", ids.workspaceId))
      .collect();

    const realPosts = posts.filter((p) => p.publishMethod === "REAL");

    const postsWithMetrics = await Promise.all(
      realPosts.map(async (post) => {
        const metrics = await ctx.db
          .query("postMetrics")
          .withIndex("by_postId", (q) => q.eq("postId", post._id))
          .unique();

        return {
          postId: post._id,
          platform: post.platform,
          content: post.content,
          publishedUrl: post.mockPublishedUrl,
          publishedAt: post.publishedAt,
          likes: metrics?.likes,
          comments: metrics?.comments,
          shares: metrics?.shares,
          views: metrics?.views,
          fetchedAt: metrics?.fetchedAt,
        };
      }),
    );

    const summary = {
      likes: 0,
      comments: 0,
      shares: 0,
      views: 0,
    };
    const byPlatform: Record<string, typeof summary> = {};

    for (const post of postsWithMetrics) {
      if (!byPlatform[post.platform]) {
        byPlatform[post.platform] = { likes: 0, comments: 0, shares: 0, views: 0 };
      }
      summary.likes += post.likes ?? 0;
      summary.comments += post.comments ?? 0;
      summary.shares += post.shares ?? 0;
      summary.views += post.views ?? 0;
      byPlatform[post.platform].likes += post.likes ?? 0;
      byPlatform[post.platform].comments += post.comments ?? 0;
      byPlatform[post.platform].shares += post.shares ?? 0;
      byPlatform[post.platform].views += post.views ?? 0;
    }

    return {
      posts: postsWithMetrics,
      summary,
      byPlatform,
    };
  },
});

export const upsertPostMetrics = internalMutation({
  args: {
    postId: v.id("posts"),
    workspaceId: v.id("workspaces"),
    platform: PLATFORM,
    likes: v.optional(v.number()),
    comments: v.optional(v.number()),
    shares: v.optional(v.number()),
    views: v.optional(v.number()),
  },
  handler: async (ctx, { postId, workspaceId, platform, likes, comments, shares, views }) => {
    const existing = await ctx.db
      .query("postMetrics")
      .withIndex("by_postId", (q) => q.eq("postId", postId))
      .unique();

    const fetchedAt = Date.now();

    if (existing !== null) {
      await ctx.db.patch("postMetrics", existing._id, {
        likes,
        comments,
        shares,
        views,
        fetchedAt,
      });
    } else {
      await ctx.db.insert("postMetrics", {
        postId,
        workspaceId,
        platform,
        likes,
        comments,
        shares,
        views,
        fetchedAt,
      });
    }
  },
});
