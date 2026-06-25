import { v } from "convex/values";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { decryptSecret, encryptSecret, createSecretPreview } from "./lib/encryption";
import { buildOAuth1Header } from "./lib/xOAuth1";
import { getGoogleAccessToken } from "./lib/googleOAuth";

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

export const connectFacebookAccount = action({
  args: { accessToken: v.string() },
  handler: async (ctx, { accessToken }) => {
    const ids = await ctx.runQuery(internal.workspaces.getMyWorkspaceId, {});
    if (ids === null) throw new Error("Not authenticated");

    const response = await fetch(
      "https://graph.facebook.com/v19.0/me?fields=id,name&access_token=" +
        encodeURIComponent(accessToken),
    );

    if (!response.ok) {
      throw new Error(`Facebook API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { name?: string };
    const accountName = data.name;
    if (!accountName) {
      throw new Error("Could not retrieve Facebook account name");
    }

    const credentialsJson = JSON.stringify({ accessToken });
    const encrypted = await encryptSecret(credentialsJson);

    await ctx.runMutation(internal.socialConnections.storeConnection, {
      workspaceId: ids.workspaceId,
      userId: ids.userId,
      platform: "FACEBOOK",
      encryptedCredentials: encrypted,
      accountHandle: accountName,
    });
  },
});

export const testFacebookConnection = action({
  args: { connectionId: v.id("socialConnections") },
  handler: async (ctx, { connectionId }) => {
    const ids = await ctx.runQuery(internal.workspaces.getMyWorkspaceId, {});
    if (ids === null) throw new Error("Not authenticated");

    const connection = await ctx.runQuery(
      internal.socialConnections.getActiveConnectionForPlatform,
      {
        workspaceId: ids.workspaceId,
        platform: "FACEBOOK",
      },
    );

    if (connection === null) {
      throw new Error("Connection not found");
    }

    const credentialsJson = await decryptSecret(connection.encryptedCredentials);
    const credentials = JSON.parse(credentialsJson) as { accessToken: string };

    try {
      const response = await fetch(
        "https://graph.facebook.com/v19.0/me?access_token=" +
          encodeURIComponent(credentials.accessToken),
      );

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

export const connectInstagramAccount = action({
  args: { pageAccessToken: v.string(), pageId: v.string() },
  handler: async (ctx, { pageAccessToken, pageId }) => {
    const ids = await ctx.runQuery(internal.workspaces.getMyWorkspaceId, {});
    if (ids === null) throw new Error("Not authenticated");

    const response = await fetch(
      `https://graph.facebook.com/v19.0/${encodeURIComponent(pageId)}?fields=instagram_business_account{id,username}&access_token=${encodeURIComponent(pageAccessToken)}`,
    );

    if (!response.ok) {
      throw new Error(`Instagram API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as {
      instagram_business_account?: { id?: string; username?: string };
    };
    const igAccount = data.instagram_business_account;
    if (!igAccount?.id || !igAccount?.username) {
      throw new Error("No linked Instagram Business account found for this page");
    }

    const credentialsJson = JSON.stringify({
      pageAccessToken,
      igUserId: igAccount.id,
    });
    const encrypted = await encryptSecret(credentialsJson);

    await ctx.runMutation(internal.socialConnections.storeConnection, {
      workspaceId: ids.workspaceId,
      userId: ids.userId,
      platform: "INSTAGRAM",
      encryptedCredentials: encrypted,
      accountHandle: igAccount.username,
    });
  },
});

export const testInstagramConnection = action({
  args: { connectionId: v.id("socialConnections") },
  handler: async (ctx, { connectionId }) => {
    const ids = await ctx.runQuery(internal.workspaces.getMyWorkspaceId, {});
    if (ids === null) throw new Error("Not authenticated");

    const connection = await ctx.runQuery(
      internal.socialConnections.getActiveConnectionForPlatform,
      {
        workspaceId: ids.workspaceId,
        platform: "INSTAGRAM",
      },
    );

    if (connection === null) {
      throw new Error("Connection not found");
    }

    const credentialsJson = await decryptSecret(connection.encryptedCredentials);
    const credentials = JSON.parse(credentialsJson) as {
      pageAccessToken: string;
      igUserId: string;
    };

    try {
      const response = await fetch(
        `https://graph.facebook.com/v19.0/${encodeURIComponent(credentials.igUserId)}?access_token=${encodeURIComponent(credentials.pageAccessToken)}`,
      );

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

export const connectYoutubeAccount = action({
  args: {
    clientId: v.string(),
    clientSecret: v.string(),
    refreshToken: v.string(),
  },
  handler: async (ctx, { clientId, clientSecret, refreshToken }) => {
    const ids = await ctx.runQuery(internal.workspaces.getMyWorkspaceId, {});
    if (ids === null) throw new Error("Not authenticated");

    const accessToken = await getGoogleAccessToken({ clientId, clientSecret, refreshToken });

    const response = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as {
      items?: Array<{ snippet?: { title?: string } }>;
    };
    const channelTitle = data.items?.[0]?.snippet?.title;
    if (!channelTitle) {
      throw new Error("Could not retrieve YouTube channel");
    }

    const credentialsJson = JSON.stringify({ clientId, clientSecret, refreshToken });
    const encrypted = await encryptSecret(credentialsJson);

    await ctx.runMutation(internal.socialConnections.storeConnection, {
      workspaceId: ids.workspaceId,
      userId: ids.userId,
      platform: "YOUTUBE",
      encryptedCredentials: encrypted,
      accountHandle: channelTitle,
    });
  },
});

export const testYoutubeConnection = action({
  args: { connectionId: v.id("socialConnections") },
  handler: async (ctx, { connectionId }) => {
    const ids = await ctx.runQuery(internal.workspaces.getMyWorkspaceId, {});
    if (ids === null) throw new Error("Not authenticated");

    const connection = await ctx.runQuery(
      internal.socialConnections.getActiveConnectionForPlatform,
      {
        workspaceId: ids.workspaceId,
        platform: "YOUTUBE",
      },
    );

    if (connection === null) {
      throw new Error("Connection not found");
    }

    const credentialsJson = await decryptSecret(connection.encryptedCredentials);
    const credentials = JSON.parse(credentialsJson) as {
      clientId: string;
      clientSecret: string;
      refreshToken: string;
    };

    try {
      const accessToken = await getGoogleAccessToken(credentials);

      const response = await fetch(
        "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

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
