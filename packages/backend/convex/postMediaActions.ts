import { v } from "convex/values";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { decryptSecret } from "./lib/encryption";
import { generatePostImageFile } from "./lib/ai";

export const generatePostImage = action({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const ids = await ctx.runQuery(internal.workspaces.getMyWorkspaceId, {});
    if (ids === null) throw new Error("Not authenticated");

    const post = await ctx.runQuery(api.posts.getPostById, { postId });
    if (post === null) throw new Error("Post not found");

    if (!post.mediaDescription) {
      throw new Error("No media description provided for image generation");
    }

    const providerSetting = await ctx.runQuery(api.apiKeys.getAiProviderSetting, {});
    const provider = providerSetting?.activeProvider ?? "OPENAI";
    const model = providerSetting?.model ?? "gpt-4o-mini";

    const keyRow = await ctx.runQuery(internal.apiKeys.getActiveApiKeyForProvider, {
      workspaceId: ids.workspaceId,
      provider,
    });
    if (keyRow === null) {
      throw new Error(`No active ${provider} API key — add one in Settings first.`);
    }

    const apiKey = await decryptSecret(keyRow.encryptedKey);

    const generated = await generatePostImageFile({
      apiKey,
      model: "dall-e-3",
      prompt: post.mediaDescription,
    });

    const blob = new Blob([generated.uint8Array as any], { type: generated.mediaType });
    const storageId = await ctx.storage.store(blob);

    await ctx.runMutation(api.posts.attachMediaToPost, {
      postId,
      storageId,
    });

    await ctx.runMutation(internal.posts.recordImageUsage, {
      workspaceId: ids.workspaceId,
      provider,
      estimatedCost: generated.estimatedCost,
    });
  },
});
