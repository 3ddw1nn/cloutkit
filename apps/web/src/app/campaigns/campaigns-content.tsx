"use client";

import { useQuery } from "convex/react";
import { useState } from "react";
import Link from "next/link";
import { api } from "@cloutkit/backend/convex/_generated/api";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CAMPAIGN_STATUSES, formatEnumLabel } from "./lib";
import type { Doc } from "@cloutkit/backend/convex/_generated/dataModel";

export function CampaignsContent() {
  const [statusFilter, setStatusFilter] = useState<Doc<"campaigns">["status"] | null>(null);
  const campaigns = useQuery(api.campaigns.getCampaigns, { status: statusFilter ?? undefined });

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
        <Link href="/campaigns/new" className={buttonVariants()}>
          New campaign
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={statusFilter === null ? "default" : "outline"}
          onClick={() => setStatusFilter(null)}
        >
          All
        </Button>
        {CAMPAIGN_STATUSES.map((status) => (
          <Button
            key={status}
            size="sm"
            variant={statusFilter === status ? "default" : "outline"}
            onClick={() => setStatusFilter(status)}
          >
            {formatEnumLabel(status)}
          </Button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {campaigns === undefined && (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}
        {campaigns?.length === 0 && (
          <p className="text-sm text-muted-foreground">No campaigns yet.</p>
        )}
        {campaigns?.map((campaign) => (
          <Link key={campaign._id} href={`/campaigns/${campaign._id}`}>
            <Card className="hover:bg-muted/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{campaign.title}</CardTitle>
                <Badge variant="secondary">{formatEnumLabel(campaign.status)}</Badge>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {formatEnumLabel(campaign.campaignType)} · {campaign.inputTopic}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
