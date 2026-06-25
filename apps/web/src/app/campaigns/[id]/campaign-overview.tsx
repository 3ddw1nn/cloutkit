"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@cloutkit/backend/convex/_generated/api";
import type { Id } from "@cloutkit/backend/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { formatEnumLabel } from "../lib";

export function CampaignOverview({ campaignId }: { campaignId: Id<"campaigns"> }) {
  const result = useQuery(api.campaigns.getCampaignById, { campaignId });

  if (result === undefined) return <p className="text-muted-foreground">Loading…</p>;
  if (result === null) return <p className="text-muted-foreground">Campaign not found.</p>;

  const { campaign, idea } = result;

  return (
    <div className="flex w-full max-w-xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{campaign.title}</h1>
          <p className="text-muted-foreground text-sm">
            {formatEnumLabel(campaign.campaignType)}
          </p>
        </div>
        <Badge variant="secondary">{formatEnumLabel(campaign.status)}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p>
            <span className="font-medium">Topic: </span>
            {campaign.inputTopic}
          </p>
          {campaign.objective && (
            <p>
              <span className="font-medium">Objective: </span>
              {campaign.objective}
            </p>
          )}
          <p>
            <span className="font-medium">Platforms: </span>
            {campaign.selectedPlatforms.join(", ")}
          </p>
          {campaign.notes && (
            <p>
              <span className="font-medium">Notes: </span>
              {campaign.notes}
            </p>
          )}
        </CardContent>
      </Card>

      {idea && (
        <Link href={`/campaigns/${campaignId}/idea`} className={buttonVariants()}>
          {idea.approved ? "View campaign idea" : "Review campaign idea"}
        </Link>
      )}
    </div>
  );
}
