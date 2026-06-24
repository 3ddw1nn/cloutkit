import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { getWorkspaceIdForCurrentUser } from "./workspaces";
import { logAudit } from "./lib/audit";

const PROVIDER = v.union(
  v.literal("OPENAI"),
  v.literal("ANTHROPIC"),
  v.literal("OPENROUTER"),
  v.literal("GROQ"),
  v.literal("GOOGLE"),
  v.literal("OTHER"),
);

export const listApiKeys = query({
  args: {},
  handler: async (ctx) => {
    const ids = await getWorkspaceIdForCurrentUser(ctx);
    if (ids === null) return [];

    const rows = await ctx.db
      .query("userApiKeys")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", ids.workspaceId))
      .collect();

    return rows
      .filter((row) => row.status !== "DELETED")
      .map((row) => ({
        _id: row._id,
        provider: row.provider,
        keyPreview: row.keyPreview,
        status: row.status,
        lastTestedAt: row.lastTestedAt,
      }));
  },
});

export const deleteApiKey = mutation({
  args: { id: v.id("userApiKeys") },
  handler: async (ctx, { id }) => {
    const ids = await getWorkspaceIdForCurrentUser(ctx);
    if (ids === null) throw new Error("Not authenticated");

    const row = await ctx.db.get("userApiKeys", id);
    if (row === null || row.workspaceId !== ids.workspaceId) {
      throw new Error("API key not found");
    }

    await ctx.db.patch("userApiKeys", id, { status: "DELETED" });
    await logAudit(ctx, {
      workspaceId: ids.workspaceId,
      userId: ids.userId,
      action: "API_KEY_DELETED",
      entityType: "userApiKeys",
      entityId: id,
    });
  },
});

export const setActiveProvider = mutation({
  args: { provider: PROVIDER, model: v.string() },
  handler: async (ctx, { provider, model }) => {
    const ids = await getWorkspaceIdForCurrentUser(ctx);
    if (ids === null) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("aiProviderSettings")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", ids.workspaceId))
      .unique();

    if (existing !== null) {
      await ctx.db.patch("aiProviderSettings", existing._id, { activeProvider: provider, model });
    } else {
      await ctx.db.insert("aiProviderSettings", {
        workspaceId: ids.workspaceId,
        activeProvider: provider,
        model,
      });
    }
  },
});

export const getAiProviderSetting = query({
  args: {},
  handler: async (ctx) => {
    const ids = await getWorkspaceIdForCurrentUser(ctx);
    if (ids === null) return null;

    return await ctx.db
      .query("aiProviderSettings")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", ids.workspaceId))
      .unique();
  },
});

// Internal-only: callers below are only reachable from convex/apiKeyActions.ts,
// never exposed to the public API surface, since they touch encrypted payloads.

export const storeApiKey = internalMutation({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    provider: PROVIDER,
    encryptedKey: v.object({ iv: v.string(), ciphertext: v.string() }),
    keyPreview: v.string(),
  },
  handler: async (ctx, { workspaceId, userId, provider, encryptedKey, keyPreview }) => {
    const existing = await ctx.db
      .query("userApiKeys")
      .withIndex("by_workspaceId_and_provider", (q) =>
        q.eq("workspaceId", workspaceId).eq("provider", provider),
      )
      .unique();

    if (existing !== null) {
      await ctx.db.patch("userApiKeys", existing._id, {
        encryptedKey,
        keyPreview,
        status: "ACTIVE",
        lastTestedAt: undefined,
      });
    } else {
      await ctx.db.insert("userApiKeys", {
        workspaceId,
        provider,
        encryptedKey,
        keyPreview,
        status: "ACTIVE",
      });
    }

    await logAudit(ctx, {
      workspaceId,
      userId,
      action: "API_KEY_CREATED",
      entityType: "userApiKeys",
      metadataJson: { provider },
    });
  },
});

export const getEncryptedApiKeyForTest = internalQuery({
  args: { apiKeyId: v.id("userApiKeys") },
  handler: async (ctx, { apiKeyId }) => {
    const row = await ctx.db.get("userApiKeys", apiKeyId);
    if (row === null) return null;
    return { encryptedKey: row.encryptedKey, workspaceId: row.workspaceId };
  },
});

export const recordTestResult = internalMutation({
  args: {
    apiKeyId: v.id("userApiKeys"),
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    success: v.boolean(),
  },
  handler: async (ctx, { apiKeyId, workspaceId, userId, success }) => {
    await ctx.db.patch("userApiKeys", apiKeyId, {
      status: success ? "ACTIVE" : "INVALID",
      lastTestedAt: Date.now(),
    });
    await logAudit(ctx, {
      workspaceId,
      userId,
      action: "API_KEY_TESTED",
      entityType: "userApiKeys",
      entityId: apiKeyId,
      metadataJson: { success },
    });
  },
});
