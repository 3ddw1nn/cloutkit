"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { api } from "@cloutkit/backend/convex/_generated/api";
import type { Id } from "@cloutkit/backend/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function formatDateHeader(dateKey: string): string {
  const date = new Date(dateKey);
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function CalendarContent() {
  const entries = useQuery(api.campaigns.getCalendarEntries);
  const cancelSchedule = useMutation(api.campaigns.cancelScheduledPublish);
  const [cancellingId, setCancellingId] = useState<Id<"campaigns"> | null>(null);

  async function handleCancel(campaignId: Id<"campaigns">) {
    setCancellingId(campaignId);
    try {
      await cancelSchedule({ campaignId });
      toast.success("Schedule cancelled");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to cancel schedule";
      toast.error(message);
    } finally {
      setCancellingId(null);
    }
  }

  if (entries === undefined) {
    return <div className="text-center text-gray-500">Loading…</div>;
  }

  const sorted = [...entries].sort((a, b) => a.date - b.date);
  const groups = new Map<string, typeof sorted>();
  for (const entry of sorted) {
    const dateKey = new Date(entry.date).toDateString();
    const group = groups.get(dateKey) ?? [];
    group.push(entry);
    groups.set(dateKey, group);
  }

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        <p className="text-muted-foreground">
          Scheduled and published campaigns across your workspace.
        </p>
      </div>

      {groups.size === 0 && (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Nothing scheduled or published yet.
          </CardContent>
        </Card>
      )}

      {Array.from(groups.entries()).map(([dateKey, dateEntries]) => (
        <Card key={dateKey}>
          <CardHeader>
            <CardTitle className="text-base">{formatDateHeader(dateKey)}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {dateEntries.map((entry) => (
              <div
                key={entry.campaignId}
                className="flex items-center justify-between gap-4 rounded-lg border p-3"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{entry.title}</span>
                    <Badge variant={entry.status === "SCHEDULED" ? "secondary" : "default"}>
                      {entry.status}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    {entry.platforms.map((platform) => (
                      <Badge key={platform} variant="outline">
                        {platform}
                      </Badge>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(entry.date).toLocaleString()}
                  </span>
                </div>
                <div className="flex gap-2">
                  {entry.status === "SCHEDULED" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={cancellingId === entry.campaignId}
                      onClick={() => handleCancel(entry.campaignId)}
                    >
                      {cancellingId === entry.campaignId ? "Cancelling…" : "Cancel"}
                    </Button>
                  ) : (
                    <Link
                      href={`/campaigns/${entry.campaignId}/sequence`}
                      className="text-sm text-blue-600 underline"
                    >
                      View
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
