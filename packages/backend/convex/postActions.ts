import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { decryptSecret } from "./lib/encryption";
import { generateFullSequence as generateFullSequenceFromAi, regeneratePost as regeneratePostFromAi } from "./lib/ai";
import type { Doc, Id } from "./_generated/dataModel";

export const generateFullSequence = action({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, { campaignId }) => {
    const ids = await ctx.runQuery(internal.workspaces.getMyWorkspaceId, {});
    if (ids === null) throw new Error("Not authenticated");

    const result = await ctx.runQuery(api.campaigns.getCampaignById, { campaignId });
    if (result === null) throw new Error("Campaign not found");

    const campaign = result.campaign;
    const idea = result.idea;
    if (!idea || !idea.approved) {
      throw new Error("Campaign idea must be approved before generating posts");
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
    const brandIdentity = await ctx.runQuery(api.brandIdentity.getBrandIdentity, {});

    const aiResult = await generateFullSequenceFromAi({
      apiKey,
      model,
      brandIdentity,
      campaign,
      idea,
    });

    // Map the generated posts to include platform/contentType/sequenceOrder from the idea's sequence
    const sequenceSlots = (idea.recommendedSequenceJson as Array<{
      platform: string;
      contentType: string;
      order: number;
    }>) || [];

    const postsWithMetadata = aiResult.posts.map((post, index) => {
      const slot = sequenceSlots[index];
      return {
        ...post,
        platform: slot.platform as any,
        contentType: slot.contentType,
        sequenceOrder: slot.order,
        rawAiOutput: JSON.stringify(post),
      };
    });

    // Persist via internal mutation
    await ctx.runMutation(internal.posts.savePostsForSequence, {
      campaignId,
      workspaceId: ids.workspaceId,
      provider,
      model,
      posts: postsWithMetadata,
      usage: aiResult.usage,
      estimatedCost: aiResult.estimatedCost,
    });
  },
});

export const regeneratePost = action({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const ids = await ctx.runQuery(internal.workspaces.getMyWorkspaceId, {});
    if (ids === null) throw new Error("Not authenticated");

    const post = await ctx.runQuery(api.posts.getPostById, { postId });
    if (!post) throw new Error("Post not found");

    const result = await ctx.runQuery(api.campaigns.getCampaignById, {
      campaignId: post.campaignId,
    });
    if (result === null) throw new Error("Campaign not found");

    const campaign = result.campaign;
    const idea = result.idea;
    if (!idea) throw new Error("Campaign idea not found");

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
    const brandIdentity = await ctx.runQuery(api.brandIdentity.getBrandIdentity, {});

    const aiResult = await regeneratePostFromAi({
      apiKey,
      model,
      brandIdentity,
      campaign,
      post,
      idea,
    });

    // Persist via internal mutation
    await ctx.runMutation(internal.posts.saveRegeneratedPost, {
      postId,
      workspaceId: ids.workspaceId,
      provider,
      model,
      content: aiResult.content,
      mediaDescription: aiResult.mediaDescription,
      usage: aiResult.usage,
      estimatedCost: aiResult.estimatedCost,
    });
  },
});
