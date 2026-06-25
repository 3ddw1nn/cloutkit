import { v } from "convex/values";
import { action, internalAction, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { decryptSecret } from "./lib/encryption";
import { buildOAuth1Header } from "./lib/xOAuth1";
import { getGoogleAccessToken } from "./lib/googleOAuth";

const MOCK_URL_TEMPLATES: Record<string, string> = {
  INSTAGRAM: "https://instagram.com/p/{id}",
  FACEBOOK: "https://facebook.com/posts/{id}",
  X: "https://x.com/i/status/{id}",
  YOUTUBE: "https://youtube.com/watch?v={id}",
};

export const publishCampaignSequence = action({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, { campaignId }): Promise<{ successCount: number; failures: string[] }> => {
    const ids = await ctx.runQuery(internal.workspaces.getMyWorkspaceId, {});
    if (ids === null) throw new Error("Not authenticated");

    return await executeCampaignPublishLogic(ctx, {
      campaignId,
      workspaceId: ids.workspaceId,
      userId: ids.userId,
    });
  },
});

export const publishScheduledCampaign = internalAction({
  args: {
    campaignId: v.id("campaigns"),
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
  },
  handler: async (ctx, { campaignId, workspaceId, userId }): Promise<void> => {
    const campaign: Doc<"campaigns"> | null = await ctx.runQuery(
      internal.campaigns.getCampaignByIdInternal,
      { campaignId, workspaceId },
    );
    if (campaign === null || campaign.status !== "SCHEDULED") {
      // Cancelled or already handled — nothing to do.
      return;
    }

    await executeCampaignPublishLogic(ctx, { campaignId, workspaceId, userId });
  },
});

async function executeCampaignPublishLogic(
  ctx: ActionCtx,
  {
    campaignId,
    workspaceId,
    userId,
  }: { campaignId: Id<"campaigns">; workspaceId: Id<"workspaces">; userId: Id<"users"> },
): Promise<{ successCount: number; failures: string[] }> {
  const ids = { workspaceId, userId };

  const campaign: Doc<"campaigns"> | null = await ctx.runQuery(
    internal.campaigns.getCampaignByIdInternal,
    { campaignId, workspaceId },
  );
  if (campaign === null) throw new Error("Campaign not found");

  if (campaign.status !== "READY_TO_PUBLISH" && campaign.status !== "SCHEDULED") {
    throw new Error(`Campaign must be READY_TO_PUBLISH to publish (current: ${campaign.status})`);
  }

  // Get all posts for this campaign
  const posts: Doc<"posts">[] = await ctx.runQuery(internal.posts.getPostsForCampaignInternal, {
    campaignId,
  });

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
      if (post.platform === "YOUTUBE") {
        const youtubeConnection = await ctx.runQuery(
          internal.socialConnections.getActiveConnectionForPlatform,
          {
            workspaceId: ids.workspaceId,
            platform: "YOUTUBE",
          },
        );

        if (youtubeConnection !== null && post.mediaStorageId) {
          try {
            const credentialsJson = await decryptSecret(youtubeConnection.encryptedCredentials);
            const credentials = JSON.parse(credentialsJson) as {
              clientId: string;
              clientSecret: string;
              refreshToken: string;
            };

            const videoBlob = await ctx.storage.get(post.mediaStorageId);
            if (!videoBlob) {
              publishResults.push({
                postId: post._id,
                success: false,
              });
              continue;
            }

            const accessToken = await getGoogleAccessToken(credentials);

            const title =
              post.content.length > 100 ? post.content.slice(0, 99) + "…" : post.content;

            // Step 1: Initiate resumable upload
            const initResponse = await fetch(
              "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                  "X-Upload-Content-Type": videoBlob.type || "video/*",
                  "X-Upload-Content-Length": String(videoBlob.size),
                },
                body: JSON.stringify({
                  snippet: {
                    title,
                    description: post.content,
                  },
                  status: {
                    privacyStatus: "public",
                  },
                }),
              },
            );

            if (!initResponse.ok) {
              publishResults.push({
                postId: post._id,
                success: false,
              });
              continue;
            }

            const uploadUrl = initResponse.headers.get("Location");
            if (!uploadUrl) {
              publishResults.push({
                postId: post._id,
                success: false,
              });
              continue;
            }

            // Step 2: Upload the video bytes
            const uploadResponse = await fetch(uploadUrl, {
              method: "PUT",
              headers: {
                "Content-Type": videoBlob.type || "video/*",
              },
              body: videoBlob,
            });

            if (!uploadResponse.ok) {
              publishResults.push({
                postId: post._id,
                success: false,
              });
              continue;
            }

            const uploadData = (await uploadResponse.json()) as { id?: string };
            const videoId = uploadData.id;

            if (!videoId) {
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
              mockPlatformPostId: videoId,
              mockPublishedUrl: `https://www.youtube.com/watch?v=${videoId}`,
              publishMethod: "REAL",
            });
            continue;
          } catch {
            // Fall through to mock publishing
          }
        }
      } else if (post.platform === "INSTAGRAM") {
        const instagramConnection = await ctx.runQuery(
          internal.socialConnections.getActiveConnectionForPlatform,
          {
            workspaceId: ids.workspaceId,
            platform: "INSTAGRAM",
          },
        );

        if (instagramConnection !== null && post.mediaStorageId) {
          try {
            const credentialsJson = await decryptSecret(
              instagramConnection.encryptedCredentials,
            );
            const credentials = JSON.parse(credentialsJson) as {
              pageAccessToken: string;
              igUserId: string;
            };

            const mediaUrl = await ctx.storage.getUrl(post.mediaStorageId);

            if (!mediaUrl) {
              publishResults.push({
                postId: post._id,
                success: false,
              });
              continue;
            }

            // Step 1: Create media container
            const containerResponse = await fetch(
              `https://graph.instagram.com/v19.0/${encodeURIComponent(credentials.igUserId)}/media`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body:
                  "image_url=" +
                  encodeURIComponent(mediaUrl) +
                  "&caption=" +
                  encodeURIComponent(post.content) +
                  "&access_token=" +
                  encodeURIComponent(credentials.pageAccessToken),
              },
            );

            if (!containerResponse.ok) {
              publishResults.push({
                postId: post._id,
                success: false,
              });
              continue;
            }

            const containerData = (await containerResponse.json()) as { id?: string };
            const mediaContainerId = containerData.id;

            if (!mediaContainerId) {
              publishResults.push({
                postId: post._id,
                success: false,
              });
              continue;
            }

            // Step 2: Publish the container
            const publishResponse = await fetch(
              `https://graph.instagram.com/v19.0/${encodeURIComponent(credentials.igUserId)}/media_publish`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body:
                  "creation_id=" +
                  encodeURIComponent(mediaContainerId) +
                  "&access_token=" +
                  encodeURIComponent(credentials.pageAccessToken),
              },
            );

            if (!publishResponse.ok) {
              publishResults.push({
                postId: post._id,
                success: false,
              });
              continue;
            }

            const publishData = (await publishResponse.json()) as { id?: string };
            const postId = publishData.id;

            if (!postId) {
              publishResults.push({
                postId: post._id,
                success: false,
              });
              continue;
            }

            // Step 3: Fetch permalink
            const permalinkResponse = await fetch(
              `https://graph.instagram.com/v19.0/${encodeURIComponent(postId)}?fields=permalink&access_token=${encodeURIComponent(credentials.pageAccessToken)}`,
            );

            if (!permalinkResponse.ok) {
              publishResults.push({
                postId: post._id,
                success: false,
              });
              continue;
            }

            const permalinkData = (await permalinkResponse.json()) as { permalink?: string };
            const permalink = permalinkData.permalink;

            publishResults.push({
              postId: post._id,
              success: true,
              publishedAt: now,
              mockPlatformPostId: postId,
              mockPublishedUrl: permalink || `https://instagram.com/p/${postId}`,
              publishMethod: "REAL",
            });
            continue;
          } catch {
            // Fall through to mock publishing
          }
        }
      } else if (post.platform === "FACEBOOK") {
        const facebookConnection = await ctx.runQuery(
          internal.socialConnections.getActiveConnectionForPlatform,
          {
            workspaceId: ids.workspaceId,
            platform: "FACEBOOK",
          },
        );

        if (facebookConnection !== null) {
          try {
            const credentialsJson = await decryptSecret(facebookConnection.encryptedCredentials);
            const credentials = JSON.parse(credentialsJson) as { accessToken: string };

            const fbResponse = await fetch(
              "https://graph.facebook.com/v19.0/me/feed?access_token=" +
                encodeURIComponent(credentials.accessToken),
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: "message=" + encodeURIComponent(post.content),
              },
            );

            if (!fbResponse.ok) {
              publishResults.push({
                postId: post._id,
                success: false,
              });
              continue;
            }

            const fbData = (await fbResponse.json()) as { id?: string };
            const postId = fbData.id;

            if (!postId) {
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
              mockPlatformPostId: postId,
              mockPublishedUrl: `https://www.facebook.com/${postId}`,
              publishMethod: "REAL",
            });
            continue;
          } catch {
            // Fall through to mock publishing
          }
        }
      } else if (post.platform === "X") {
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
}
