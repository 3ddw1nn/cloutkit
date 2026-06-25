import { v } from "convex/values";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { decryptSecret, encryptSecret, createSecretPreview } from "./lib/encryption";
import { buildOAuth1Header } from "./lib/xOAuth1";

export const connectXAccount = action({
  args: {
    apiKey: v.string(),
    apiSecret: v.string(),
    accessToken: v.string(),
    accessTokenSecret: v.string(),
  },
  handler: async (ctx, { apiKey, apiSecret, accessToken, accessTokenSecret }) => {
    const ids = await ctx.runQuery(internal.workspaces.getMyWorkspaceId, {});
    if (ids === null) throw new Error("Not authenticated");

    // Verify credentials by fetching current user from X API
    const authHeader = await buildOAuth1Header({
      method: "GET",
      url: "https://api.twitter.com/2/users/me",
      consumerKey: apiKey,
      consumerSecret: apiSecret,
      accessToken,
      accessTokenSecret,
    });

    const response = await fetch("https://api.twitter.com/2/users/me", {
      method: "GET",
      headers: {
        Authorization: authHeader,
      },
    });

    if (!response.ok) {
      throw new Error(`X API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { data?: { username?: string } };
    const accountHandle = data.data?.username;
    if (!accountHandle) {
      throw new Error("Could not retrieve X account handle");
    }

    // Encrypt credentials as JSON bundle
    const credentialsJson = JSON.stringify({
      apiKey,
      apiSecret,
      accessToken,
      accessTokenSecret,
    });
    const encrypted = await encryptSecret(credentialsJson);

    await ctx.runMutation(internal.socialConnections.storeConnection, {
      workspaceId: ids.workspaceId,
      userId: ids.userId,
      platform: "X",
      encryptedCredentials: encrypted,
      accountHandle,
    });
  },
});

export const testConnection = action({
  args: { connectionId: v.id("socialConnections") },
  handler: async (ctx, { connectionId }) => {
    const ids = await ctx.runQuery(internal.workspaces.getMyWorkspaceId, {});
    if (ids === null) throw new Error("Not authenticated");

    const connection = await ctx.runQuery(
      internal.socialConnections.getActiveConnectionForPlatform,
      {
        workspaceId: ids.workspaceId,
        platform: "X",
      },
    );

    if (connection === null) {
      throw new Error("Connection not found");
    }

    const credentialsJson = await decryptSecret(connection.encryptedCredentials);
    const credentials = JSON.parse(credentialsJson) as {
      apiKey: string;
      apiSecret: string;
      accessToken: string;
      accessTokenSecret: string;
    };

    try {
      const authHeader = await buildOAuth1Header({
        method: "GET",
        url: "https://api.twitter.com/2/users/me",
        consumerKey: credentials.apiKey,
        consumerSecret: credentials.apiSecret,
        accessToken: credentials.accessToken,
        accessTokenSecret: credentials.accessTokenSecret,
      });

      const response = await fetch("https://api.twitter.com/2/users/me", {
        method: "GET",
        headers: {
          Authorization: authHeader,
        },
      });

      const success = response.ok;
      await ctx.runMutation(internal.socialConnections.recordTestResult, {
        connectionId,
        workspaceId: ids.workspaceId,
        userId: ids.userId,
        success,
      });

      return { success };
    } catch {
      await ctx.runMutation(internal.socialConnections.recordTestResult, {
        connectionId,
        workspaceId: ids.workspaceId,
        userId: ids.userId,
        success: false,
      });

      return { success: false };
    }
  },
});
