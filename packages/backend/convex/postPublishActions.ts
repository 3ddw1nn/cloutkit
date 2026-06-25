import { v } from "convex/values";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { decryptSecret } from "./lib/encryption";
import { buildOAuth1Header } from "./lib/xOAuth1";

const MOCK_URL_TEMPLATES: Record<string, string> = {
  INSTAGRAM: "https://instagram.com/p/{id}",
  FACEBOOK: "https://facebook.com/posts/{id}",
  X: "https://x.com/i/status/{id}",
  YOUTUBE: "https://youtube.com/watch?v={id}",
};

export const publishCampaignSequence = action({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, { campaignId }) => {
    const ids = await ctx.runQuery(internal.workspaces.getMyWorkspaceId, {});
    if (ids === null) throw new Error("Not authenticated");

    const result = await ctx.runQuery(api.campaigns.getCampaignById, { campaignId });
    if (result === null) throw new Error("Campaign not found");

    const { campaign } = result;
    if (campaign.status !== "READY_TO_PUBLISH") {
      throw new Error(`Campaign must be READY_TO_PUBLISH to publish (current: ${campaign.status})`);
    }

    // Get all posts for this campaign
    const posts = await ctx.runQuery(api.posts.getPostsForCampaign, { campaignId });

    const publishResults: Array<{
      postId: string;
      success: boolean;
      publishedAt?: number;
      mockPlatformPostId?: string;
      mockPublishedUrl?: string;
      publishMethod?: "MOCK" | "REAL";
    }> = [];

    // Publish each post
    const now = Date.now();
    for (const post of posts) {
      if (post.publishedAt) {
        // Already published, skip
        publishResults.push({
          postId: post._id,
          success: true,
          publishedAt: post.publishedAt,
          mockPlatformPostId: post.mockPlatformPostId,
          mockPublishedUrl: post.mockPublishedUrl,
          publishMethod: post.publishMethod as "MOCK" | "REAL" | undefined,
        });
        continue;
      }

      // Check if this post's platform has a real connection
      if (post.platform === "X") {
        const xConnection = await ctx.runQuery(
          internal.socialConnections.getActiveConnectionForPlatform,
          {
            workspaceId: ids.workspaceId,
            platform: "X",
          },
        );

        if (xConnection !== null) {
          // Try to post to real X API
          try {
            const credentialsJson = await decryptSecret(xConnection.encryptedCredentials);
            const credentials = JSON.parse(credentialsJson) as {
              apiKey: string;
              apiSecret: string;
              accessToken: string;
              accessTokenSecret: string;
            };

            // Check character limit
            if (post.content.length > 280) {
              publishResults.push({
                postId: post._id,
                success: false,
              });
              continue;
            }

            const authHeader = await buildOAuth1Header({
              method: "POST",
              url: "https://api.twitter.com/2/tweets",
              consumerKey: credentials.apiKey,
              consumerSecret: credentials.apiSecret,
              accessToken: credentials.accessToken,
              accessTokenSecret: credentials.accessTokenSecret,
            });

            const xResponse = await fetch("https://api.twitter.com/2/tweets", {
              method: "POST",
              headers: {
                Authorization: authHeader,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ text: post.content }),
            });

            if (!xResponse.ok) {
              publishResults.push({
                postId: post._id,
                success: false,
              });
              continue;
            }

            const xData = (await xResponse.json()) as { data?: { id?: string } };
            const tweetId = xData.data?.id;

            if (!tweetId) {
              publishResults.push({
                postId: post._id,
                success: false,
              });
              continue;
            }

            publishResults.push({
              postId: post._id,
              success: true,
              publishedAt: now,
              mockPlatformPostId: tweetId,
              mockPublishedUrl: `https://x.com/${xConnection.accountHandle}/status/${tweetId}`,
              publishMethod: "REAL",
            });
            continue;
          } catch {
            // Fall through to mock publishing
          }
        }
      }

      // Fall back to mock publishing for other platforms or if real posting failed
      const mockPostId = post._id;
      const template = MOCK_URL_TEMPLATES[post.platform] || MOCK_URL_TEMPLATES.X;
      const mockUrl = template.replace("{id}", mockPostId);

      publishResults.push({
        postId: post._id,
        success: true,
        publishedAt: now,
        mockPlatformPostId: mockPostId,
        mockPublishedUrl: mockUrl,
        publishMethod: "MOCK",
      });
    }

    // Persist all results in one atomic transaction
    await ctx.runMutation(internal.posts.completeCampaignPublish, {
      campaignId,
      workspaceId: ids.workspaceId,
      userId: ids.userId,
      results: publishResults.map((r) => ({
        ...r,
        postId: r.postId as any,
      })),
    });

    const successCount = publishResults.filter((r) => r.success).length;
    const failures = publishResults.filter((r) => !r.success).map((r) => r.postId);

    return { successCount, failures };
  },
});
