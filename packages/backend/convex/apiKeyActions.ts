import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { encryptSecret, decryptSecret, createSecretPreview } from "./lib/encryption";

const PROVIDER = v.union(
  v.literal("OPENAI"),
  v.literal("ANTHROPIC"),
  v.literal("OPENROUTER"),
  v.literal("GROQ"),
  v.literal("GOOGLE"),
  v.literal("OTHER"),
);

export const createApiKey = action({
  args: { provider: PROVIDER, apiKey: v.string() },
  handler: async (ctx, { provider, apiKey }) => {
    const ids = await ctx.runQuery(internal.workspaces.getMyWorkspaceId, {});
    if (ids === null) throw new Error("Not authenticated");
    if (!apiKey.trim()) throw new Error("API key cannot be empty");

    const encryptedKey = await encryptSecret(apiKey);
    const keyPreview = createSecretPreview(apiKey);

    await ctx.runMutation(internal.apiKeys.storeApiKey, {
      workspaceId: ids.workspaceId,
      userId: ids.userId,
      provider,
      encryptedKey,
      keyPreview,
    });
  },
});

async function testOpenAiKey(apiKey: string): Promise<boolean> {
  const response = await fetch("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  return response.ok;
}

export const testApiKey = action({
  args: { apiKeyId: v.id("userApiKeys") },
  handler: async (ctx, { apiKeyId }) => {
    const ids = await ctx.runQuery(internal.workspaces.getMyWorkspaceId, {});
    if (ids === null) throw new Error("Not authenticated");

    const row = await ctx.runQuery(internal.apiKeys.getEncryptedApiKeyForTest, { apiKeyId });
    if (row === null || row.workspaceId !== ids.workspaceId) {
      throw new Error("API key not found");
    }

    const decrypted = await decryptSecret(row.encryptedKey);
    // Only OpenAI is wired up for testing in this phase; other providers
    // are schema-ready but not yet supported end-to-end.
    const success = await testOpenAiKey(decrypted);

    await ctx.runMutation(internal.apiKeys.recordTestResult, {
      apiKeyId,
      workspaceId: ids.workspaceId,
      userId: ids.userId,
      success,
    });

    return { success };
  },
});
