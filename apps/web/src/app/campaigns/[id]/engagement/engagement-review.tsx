"use client";

import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "@cloutkit/backend/convex/_generated/api";
import type { Id } from "@cloutkit/backend/convex/_generated/dataModel";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { OpportunityCard } from "@/components/opportunity-card";

interface EngagementReviewProps {
  campaignId: Id<"campaigns">;
}

export function EngagementReview({ campaignId }: EngagementReviewProps) {
  const campaign = useQuery(api.campaigns.getCampaignById, { campaignId });
  const waveData = useQuery(api.engagement.getEngagementWaveForCampaign, { campaignId });
  const generateWave = useAction(api.engagementActions.generateCampaignEngagementWave);
  const approveOpp = useMutation(api.engagement.approveOpportunity);
  const rejectOpp = useMutation(api.engagement.rejectOpportunity);
  const updateOppText = useMutation(api.engagement.updateOpportunityText);
  const [generating, setGenerating] = useState(false);

  if (!campaign) {
    return <div className="text-center text-gray-500">Loading...</div>;
  }

  if (!campaign.campaign) {
    return <div className="text-center text-gray-500">Campaign not found</div>;
  }

  const wave = waveData?.wave;
  const opportunities = waveData?.opportunities || [];
  const isCompleted = campaign.campaign.status === "COMPLETED";

  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", { weekday: "long" });
  };

  const handleGenerateWave = async () => {
    setGenerating(true);
    try {
      await generateWave({ campaignId });
      toast.success("Engagement wave generated!");
    } catch {
      toast.error("Failed to generate engagement wave");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="w-full max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{campaign.campaign.title}</h1>
        <p className="mt-2 text-sm text-gray-600">
          Campaign status: <Badge className="ml-2">{campaign.campaign.status}</Badge>
        </p>
      </div>

      {isCompleted && (
        <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
          <p className="text-sm font-medium text-blue-900">
            ✓ Engagement wave review complete!
          </p>
        </div>
      )}

      {campaign.campaign.status === "PUBLISHED" && !wave && (
        <div className="rounded-lg bg-green-50 p-4 border border-green-200 flex items-center justify-between">
          <p className="text-sm font-medium text-green-900">
            Ready to generate engagement opportunities for {getDayName(new Date().toISOString().split("T")[0])}.
          </p>
          <Button onClick={handleGenerateWave} disabled={generating} size="sm">
            {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {generating ? "Generating…" : "Generate wave"}
          </Button>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">
          {wave ? `Opportunities for ${getDayName(wave.dayDate)}` : "Engagement opportunities"}
        </h2>
        {opportunities.length === 0 ? (
          <p className="text-sm text-gray-500">
            {campaign.campaign.status === "PUBLISHED"
              ? "No wave generated yet."
              : "Campaign must be published to generate engagement opportunities."}
          </p>
        ) : (
          <div className="space-y-4">
            {opportunities.map((opp) => (
              <OpportunityCard
                key={opp._id}
                opportunity={opp}
                onApprove={async () => {
                  await approveOpp({ opportunityId: opp._id });
                }}
                onReject={async () => {
                  await rejectOpp({ opportunityId: opp._id });
                }}
                onSaveText={async (text) => {
                  await updateOppText({ opportunityId: opp._id, proposedText: text });
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
