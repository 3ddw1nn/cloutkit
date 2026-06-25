import { v } from "convex/values";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { decryptSecret } from "./lib/encryption";
import { generateCampaignIdea as generateCampaignIdeaFromAi } from "./lib/ai";

export const generateCampaignIdea = action({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, { campaignId }) => {
    const ids = await ctx.runQuery(internal.workspaces.getMyWorkspaceId, {});
    if (ids === null) throw new Error("Not authenticated");

    const result = await ctx.runQuery(api.campaigns.getCampaignById, { campaignId });
    if (result === null) throw new Error("Campaign not found");

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
    const platformGoals = await ctx.runQuery(api.platformGoals.getPlatformGoals, {});

    const generated = await generateCampaignIdeaFromAi({
      apiKey,
      model,
      brandIdentity,
      campaign: result.campaign,
      platformGoals,
    });

    await ctx.runMutation(internal.campaigns.saveCampaignIdea, {
      campaignId,
      workspaceId: ids.workspaceId,
      provider,
      model,
      idea: {
        mainAngle: generated.data.mainAngle,
        targetAudience: generated.data.targetAudience,
        tone: generated.data.tone,
        keyMessage: generated.data.keyMessage,
        platformStrategyJson: generated.data.platformStrategy,
        contentDirection: generated.data.contentDirection,
        engagementStrategy: generated.data.engagementStrategy,
        recommendedSequenceJson: generated.data.recommendedSequence,
        rawAiOutput: generated.rawAiOutput,
      },
      usage: generated.usage,
      estimatedCost: generated.estimatedCost,
    });
  },
});
