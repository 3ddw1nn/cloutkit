import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { decryptSecret } from "./lib/encryption";
import { buildOAuth1Header } from "./lib/xOAuth1";
import { getGoogleAccessToken } from "./lib/googleOAuth";

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export const refreshWorkspaceMetrics = action({
  args: {},
  handler: async (ctx) => {
    const ids = await ctx.runQuery(internal.workspaces.getMyWorkspaceId, {});
    if (ids === null) throw new Error("Not authenticated");

    const realPosts = await ctx.runQuery(internal.posts.getRealPublishedPostsForWorkspace, {
      workspaceId: ids.workspaceId,
    });

    let refreshedCount = 0;
    let skippedCount = 0;

    const postsByPlatform: Record<string, typeof realPosts> = {};
    for (const post of realPosts) {
      if (!postsByPlatform[post.platform]) postsByPlatform[post.platform] = [];
      postsByPlatform[post.platform].push(post);
    }

    // X: batch fetch via tweets?ids=
    const xPosts = postsByPlatform["X"] ?? [];
    if (xPosts.length > 0) {
      const xConnection = await ctx.runQuery(internal.socialConnections.getActiveConnectionForPlatform, {
        workspaceId: ids.workspaceId,
        platform: "X",
      });

      if (xConnection !== null) {
        try {
          const credentialsJson = await decryptSecret(xConnection.encryptedCredentials);
          const credentials = JSON.parse(credentialsJson) as {
            apiKey: string;
            apiSecret: string;
            accessToken: string;
            accessTokenSecret: string;
          };

          for (const batch of chunk(xPosts, 100)) {
            try {
              const idsParam = batch.map((p) => p.mockPlatformPostId).join(",");
              const url = `https://api.twitter.com/2/tweets?ids=${encodeURIComponent(idsParam)}&tweet.fields=public_metrics`;
              const authHeader = await buildOAuth1Header({
                method: "GET",
                url,
                consumerKey: credentials.apiKey,
                consumerSecret: credentials.apiSecret,
                accessToken: credentials.accessToken,
                accessTokenSecret: credentials.accessTokenSecret,
              });

              const response = await fetch(url, {
                headers: { Authorization: authHeader },
              });

              if (!response.ok) {
                skippedCount += batch.length;
                continue;
              }

              const result = (await response.json()) as {
                data?: Array<{
                  id: string;
                  public_metrics?: {
                    like_count?: number;
                    retweet_count?: number;
                    reply_count?: number;
                  };
                }>;
              };

              for (const tweet of result.data ?? []) {
                const post = batch.find((p) => p.mockPlatformPostId === tweet.id);
                if (!post) continue;
                await ctx.runMutation(internal.postMetrics.upsertPostMetrics, {
                  postId: post._id,
                  workspaceId: ids.workspaceId,
                  platform: "X",
                  likes: tweet.public_metrics?.like_count,
                  shares: tweet.public_metrics?.retweet_count,
                  comments: tweet.public_metrics?.reply_count,
                });
                refreshedCount++;
              }
            } catch {
              skippedCount += batch.length;
            }
          }
        } catch {
          skippedCount += xPosts.length;
        }
      } else {
        skippedCount += xPosts.length;
      }
    }

    // Facebook: per-post fetch
    const fbPosts = postsByPlatform["FACEBOOK"] ?? [];
    if (fbPosts.length > 0) {
      const fbConnection = await ctx.runQuery(internal.socialConnections.getActiveConnectionForPlatform, {
        workspaceId: ids.workspaceId,
        platform: "FACEBOOK",
      });

      if (fbConnection !== null) {
        try {
          const credentialsJson = await decryptSecret(fbConnection.encryptedCredentials);
          const credentials = JSON.parse(credentialsJson) as { accessToken: string };

          for (const post of fbPosts) {
            try {
              const response = await fetch(
                `https://graph.facebook.com/v19.0/${encodeURIComponent(post.mockPlatformPostId!)}?fields=likes.summary(true),comments.summary(true),shares&access_token=${encodeURIComponent(credentials.accessToken)}`,
              );

              if (!response.ok) {
                skippedCount++;
                continue;
              }

              const result = (await response.json()) as {
                likes?: { summary?: { total_count?: number } };
                comments?: { summary?: { total_count?: number } };
                shares?: { count?: number };
              };

              await ctx.runMutation(internal.postMetrics.upsertPostMetrics, {
                postId: post._id,
                workspaceId: ids.workspaceId,
                platform: "FACEBOOK",
                likes: result.likes?.summary?.total_count,
                comments: result.comments?.summary?.total_count,
                shares: result.shares?.count,
              });
              refreshedCount++;
            } catch {
              skippedCount++;
            }
          }
        } catch {
          skippedCount += fbPosts.length;
        }
      } else {
        skippedCount += fbPosts.length;
      }
    }

    // Instagram: per-post fetch
    const igPosts = postsByPlatform["INSTAGRAM"] ?? [];
    if (igPosts.length > 0) {
      const igConnection = await ctx.runQuery(internal.socialConnections.getActiveConnectionForPlatform, {
        workspaceId: ids.workspaceId,
        platform: "INSTAGRAM",
      });

      if (igConnection !== null) {
        try {
          const credentialsJson = await decryptSecret(igConnection.encryptedCredentials);
          const credentials = JSON.parse(credentialsJson) as {
            pageAccessToken: string;
            igUserId: string;
          };

          for (const post of igPosts) {
            try {
              const response = await fetch(
                `https://graph.facebook.com/v19.0/${encodeURIComponent(post.mockPlatformPostId!)}?fields=like_count,comments_count&access_token=${encodeURIComponent(credentials.pageAccessToken)}`,
              );

              if (!response.ok) {
                skippedCount++;
                continue;
              }

              const result = (await response.json()) as {
                like_count?: number;
                comments_count?: number;
              };

              await ctx.runMutation(internal.postMetrics.upsertPostMetrics, {
                postId: post._id,
                workspaceId: ids.workspaceId,
                platform: "INSTAGRAM",
                likes: result.like_count,
                comments: result.comments_count,
              });
              refreshedCount++;
            } catch {
              skippedCount++;
            }
          }
        } catch {
          skippedCount += igPosts.length;
        }
      } else {
        skippedCount += igPosts.length;
      }
    }

    // YouTube: batch fetch via videos?id=
    const ytPosts = postsByPlatform["YOUTUBE"] ?? [];
    if (ytPosts.length > 0) {
      const ytConnection = await ctx.runQuery(internal.socialConnections.getActiveConnectionForPlatform, {
        workspaceId: ids.workspaceId,
        platform: "YOUTUBE",
      });

      if (ytConnection !== null) {
        try {
          const credentialsJson = await decryptSecret(ytConnection.encryptedCredentials);
          const credentials = JSON.parse(credentialsJson) as {
            clientId: string;
            clientSecret: string;
            refreshToken: string;
          };
          const accessToken = await getGoogleAccessToken(credentials);

          for (const batch of chunk(ytPosts, 50)) {
            try {
              const idsParam = batch.map((p) => p.mockPlatformPostId).join(",");
              const response = await fetch(
                `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${encodeURIComponent(idsParam)}`,
                {
                  headers: { Authorization: `Bearer ${accessToken}` },
                },
              );

              if (!response.ok) {
                skippedCount += batch.length;
                continue;
              }

              const result = (await response.json()) as {
                items?: Array<{
                  id: string;
                  statistics?: {
                    viewCount?: string;
                    likeCount?: string;
                    commentCount?: string;
                  };
                }>;
              };

              for (const video of result.items ?? []) {
                const post = batch.find((p) => p.mockPlatformPostId === video.id);
                if (!post) continue;
                await ctx.runMutation(internal.postMetrics.upsertPostMetrics, {
                  postId: post._id,
                  workspaceId: ids.workspaceId,
                  platform: "YOUTUBE",
                  views: video.statistics?.viewCount
                    ? Number(video.statistics.viewCount)
                    : undefined,
                  likes: video.statistics?.likeCount
                    ? Number(video.statistics.likeCount)
                    : undefined,
                  comments: video.statistics?.commentCount
                    ? Number(video.statistics.commentCount)
                    : undefined,
                });
                refreshedCount++;
              }
            } catch {
              skippedCount += batch.length;
            }
          }
        } catch {
          skippedCount += ytPosts.length;
        }
      } else {
        skippedCount += ytPosts.length;
      }
    }

    return { refreshedCount, skippedCount };
  },
});
