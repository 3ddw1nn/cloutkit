"use client";

import { useAction, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@cloutkit/backend/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";

function MetricStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col">
      <span className="text-2xl font-semibold">{value.toLocaleString()}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export function AnalyticsContent() {
  const data = useQuery(api.postMetrics.getWorkspaceMetrics);
  const refreshMetrics = useAction(api.postMetricsActions.refreshWorkspaceMetrics);
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const result = await refreshMetrics({});
      toast.success(`Refreshed ${result.refreshedCount} post(s)`);
      if (result.skippedCount > 0) {
        toast.error(`${result.skippedCount} post(s) skipped (no connection or API error)`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to refresh metrics";
      toast.error(message);
    } finally {
      setRefreshing(false);
    }
  }

  if (data === undefined) {
    return <div className="text-center text-gray-500">Loading…</div>;
  }

  if (data === null) {
    return <div className="text-center text-gray-500">Not authenticated</div>;
  }

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Real performance metrics for your published posts.
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing}>
          {refreshing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {refreshing ? "Refreshing…" : "Refresh metrics"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Totals</CardTitle>
          <CardDescription>Across all connected platforms</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-8">
          <MetricStat label="Likes" value={data.summary.likes} />
          <MetricStat label="Comments" value={data.summary.comments} />
          <MetricStat label="Shares" value={data.summary.shares} />
          <MetricStat label="Views" value={data.summary.views} />
        </CardContent>
      </Card>

      {Object.entries(data.byPlatform).map(([platform, metrics]) => (
        <Card key={platform}>
          <CardHeader>
            <CardTitle>{platform}</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-8">
            <MetricStat label="Likes" value={metrics.likes} />
            <MetricStat label="Comments" value={metrics.comments} />
            <MetricStat label="Shares" value={metrics.shares} />
            <MetricStat label="Views" value={metrics.views} />
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle>Published posts</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {data.posts.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No real-published posts yet. Publish a campaign with a connected platform first.
            </p>
          )}
          {data.posts.map((post) => (
            <div key={post.postId} className="rounded-lg border p-3">
              <div className="mb-2 flex items-center gap-2">
                <Badge variant="outline">{post.platform}</Badge>
                {post.publishedAt && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(post.publishedAt).toLocaleString()}
                  </span>
                )}
              </div>
              <p className="mb-2 text-sm">{post.content}</p>
              <div className="flex gap-4 text-xs text-muted-foreground">
                {post.likes !== undefined && <span>{post.likes} likes</span>}
                {post.comments !== undefined && <span>{post.comments} comments</span>}
                {post.shares !== undefined && <span>{post.shares} shares</span>}
                {post.views !== undefined && <span>{post.views} views</span>}
                {post.fetchedAt === undefined && <span>Not yet fetched</span>}
              </div>
              {post.publishedUrl && (
                <a
                  href={post.publishedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-xs text-blue-600 underline"
                >
                  View post
                </a>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
