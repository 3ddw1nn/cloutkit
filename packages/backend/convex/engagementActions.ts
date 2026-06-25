import { v } from "convex/values";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { decryptSecret } from "./lib/encryption";
import {
  generateEngagementWave as generateEngagementWaveAi,
  generateRoutineEngagementQueue as generateRoutineEngagementQueueAi,
} from "./lib/ai";

export const generateCampaignEngagementWave = action({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, { campaignId }) => {
    const ids = await ctx.runQuery(internal.workspaces.getMyWorkspaceId, {});
    if (ids === null) throw new Error("Not authenticated");

    const result = await ctx.runQuery(api.campaigns.getCampaignById, { campaignId });
    if (result === null) throw new Error("Campaign not found");
    const { campaign, idea } = result;

    if (campaign.status !== "PUBLISHED") {
      throw new Error("Campaign must be PUBLISHED to generate engagement wave");
    }

    if (idea === null) throw new Error("No campaign idea found");

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

    const today = new Date();
    const dayDate = today.toISOString().split("T")[0];
    const dayOfWeek = today.getDay();
    const dayType = dayOfWeek === 0 || dayOfWeek === 6 ? "WEEKEND" : "WEEKDAY";

    const generated = await generateEngagementWaveAi({
      apiKey,
      model,
      brandIdentity,
      campaign,
      idea,
      dayDate,
      dayType: dayType as "WEEKDAY" | "WEEKEND",
    });

    await ctx.runMutation(internal.engagement.saveEngagementWave, {
      campaignId,
      workspaceId: ids.workspaceId,
      provider,
      model,
      dayDate,
      dayType,
      opportunities: generated.opportunities,
      rawAiOutput: generated.rawAiOutput,
      usage: generated.usage,
      estimatedCost: generated.estimatedCost,
    });
  },
});

export const generateRoutineEngagementQueue = action({
  args: {},
  handler: async (ctx) => {
    const ids = await ctx.runQuery(internal.workspaces.getMyWorkspaceId, {});
    if (ids === null) throw new Error("Not authenticated");

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
    const routineSettings = await ctx.runQuery(api.engagement.getRoutineSettings, {});

    const targets = {
      comments: routineSettings?.commentsPerDay ?? 5,
      likes: routineSettings?.likesPerDay ?? 5,
      follows: routineSettings?.followsPerDay ?? 5,
      replies: routineSettings?.repliesPerDay ?? 5,
    };

    const generated = await generateRoutineEngagementQueueAi({
      apiKey,
      model,
      brandIdentity,
      platformGoals,
      targets,
    });

    await ctx.runMutation(internal.engagement.saveRoutineQueue, {
      workspaceId: ids.workspaceId,
      provider,
      model,
      opportunities: generated.opportunities,
      usage: generated.usage,
      estimatedCost: generated.estimatedCost,
    });
  },
});
