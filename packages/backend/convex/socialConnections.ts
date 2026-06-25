import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { getWorkspaceIdForCurrentUser } from "./workspaces";
import { logAudit } from "./lib/audit";
import { PLATFORM } from "./lib/validators";

export const listConnections = query({
  args: {},
  handler: async (ctx) => {
    const ids = await getWorkspaceIdForCurrentUser(ctx);
    if (ids === null) return [];

    const rows = await ctx.db
      .query("socialConnections")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", ids.workspaceId))
      .collect();

    return rows
      .filter((row) => row.status !== "DELETED")
      .map((row) => ({
        _id: row._id,
        platform: row.platform,
        accountHandle: row.accountHandle,
        status: row.status,
        lastTestedAt: row.lastTestedAt,
      }));
  },
});

export const deleteConnection = mutation({
  args: { id: v.id("socialConnections") },
  handler: async (ctx, { id }) => {
    const ids = await getWorkspaceIdForCurrentUser(ctx);
    if (ids === null) throw new Error("Not authenticated");

    const row = await ctx.db.get("socialConnections", id);
    if (row === null || row.workspaceId !== ids.workspaceId) {
      throw new Error("Connection not found");
    }

    await ctx.db.patch("socialConnections", id, { status: "DELETED" });
    await logAudit(ctx, {
      workspaceId: ids.workspaceId,
      userId: ids.userId,
      action: "SOCIAL_CONNECTION_DELETED",
      entityType: "socialConnections",
      entityId: id,
      metadataJson: { platform: row.platform },
    });
  },
});

export const storeConnection = internalMutation({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    platform: PLATFORM,
    encryptedCredentials: v.object({
      iv: v.string(),
      ciphertext: v.string(),
    }),
    accountHandle: v.string(),
  },
  handler: async (
    ctx,
    { workspaceId, userId, platform, encryptedCredentials, accountHandle },
  ) => {
    const existing = await ctx.db
      .query("socialConnections")
      .withIndex("by_workspaceId_and_platform", (q) =>
        q.eq("workspaceId", workspaceId).eq("platform", platform),
      )
      .unique();

    if (existing !== null) {
      await ctx.db.patch("socialConnections", existing._id, {
        encryptedCredentials,
        accountHandle,
        status: "ACTIVE",
        lastTestedAt: undefined,
      });
    } else {
      await ctx.db.insert("socialConnections", {
        workspaceId,
        platform,
        encryptedCredentials,
        accountHandle,
        status: "ACTIVE",
      });
    }

    await logAudit(ctx, {
      workspaceId,
      userId,
      action: "SOCIAL_CONNECTION_CREATED",
      entityType: "socialConnections",
      metadataJson: { platform, accountHandle },
    });
  },
});

export const getActiveConnectionForPlatform = internalQuery({
  args: { workspaceId: v.id("workspaces"), platform: PLATFORM },
  handler: async (ctx, { workspaceId, platform }) => {
    const row = await ctx.db
      .query("socialConnections")
      .withIndex("by_workspaceId_and_platform", (q) =>
        q.eq("workspaceId", workspaceId).eq("platform", platform),
      )
      .unique();

    if (row === null || row.status !== "ACTIVE") return null;

    return {
      _id: row._id,
      encryptedCredentials: row.encryptedCredentials,
      accountHandle: row.accountHandle,
    };
  },
});

export const recordTestResult = internalMutation({
  args: {
    connectionId: v.id("socialConnections"),
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    success: v.boolean(),
  },
  handler: async (ctx, { connectionId, workspaceId, userId, success }) => {
    await ctx.db.patch("socialConnections", connectionId, {
      status: success ? "ACTIVE" : "INVALID",
      lastTestedAt: Date.now(),
    });

    await logAudit(ctx, {
      workspaceId,
      userId,
      action: "SOCIAL_CONNECTION_TESTED",
      entityType: "socialConnections",
      entityId: connectionId,
      metadataJson: { success },
    });
  },
});
