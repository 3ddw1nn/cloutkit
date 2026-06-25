"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@cloutkit/backend/convex/_generated/api";
import type { Doc, Id } from "@cloutkit/backend/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

function IdeaEditForm({
  idea,
  onSave,
}: {
  idea: Doc<"campaignIdeas">;
  onSave: (patch: { mainAngle: string; keyMessage: string; contentDirection: string }) => Promise<void>;
}) {
  const [mainAngle, setMainAngle] = useState(idea.mainAngle);
  const [keyMessage, setKeyMessage] = useState(idea.keyMessage);
  const [contentDirection, setContentDirection] = useState(idea.contentDirection);
  const [saving, setSaving] = useState(false);

  async function handleSaveEdits() {
    setSaving(true);
    try {
      await onSave({ mainAngle, keyMessage, contentDirection });
      toast.success("Saved");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Editable</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="mainAngle">Main angle</Label>
          <Textarea id="mainAngle" value={mainAngle} onChange={(e) => setMainAngle(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="keyMessage">Key message</Label>
          <Textarea
            id="keyMessage"
            value={keyMessage}
            onChange={(e) => setKeyMessage(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="contentDirection">Content direction</Label>
          <Textarea
            id="contentDirection"
            value={contentDirection}
            onChange={(e) => setContentDirection(e.target.value)}
          />
        </div>
        <Button variant="outline" onClick={handleSaveEdits} disabled={saving}>
          {saving ? "Saving…" : "Save edits"}
        </Button>
      </CardContent>
    </Card>
  );
}

export function CampaignIdeaReview({ campaignId }: { campaignId: Id<"campaigns"> }) {
  const router = useRouter();
  const result = useQuery(api.campaigns.getCampaignById, { campaignId });
  const approveCampaignIdea = useMutation(api.campaigns.approveCampaignIdea);
  const updateCampaignIdea = useMutation(api.campaigns.updateCampaignIdea);
  const generateCampaignIdea = useAction(api.campaignActions.generateCampaignIdea);
  const generateSequence = useAction(api.postActions.generateFullSequence);

  const [regenerating, setRegenerating] = useState(false);
  const [generatingSequence, setGeneratingSequence] = useState(false);

  if (result === undefined) return <p className="text-muted-foreground">Loading…</p>;
  const idea = result?.idea;
  if (result === null || !idea) {
    return <p className="text-muted-foreground">No campaign idea yet.</p>;
  }

  async function handleApprove() {
    await approveCampaignIdea({ campaignId });
    toast.success("Idea approved");
  }

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      await generateCampaignIdea({ campaignId });
      toast.success("Idea regenerated");
    } catch {
      toast.error("Could not regenerate idea");
    } finally {
      setRegenerating(false);
    }
  }

  async function handleGenerateSequence() {
    setGeneratingSequence(true);
    try {
      await generateSequence({ campaignId });
      toast.success("Sequence generated!");
      router.push(`/campaigns/${campaignId}/sequence`);
    } catch (error) {
      toast.error("Could not generate sequence");
      console.error(error);
    } finally {
      setGeneratingSequence(false);
    }
  }

  const platformStrategy = idea.platformStrategyJson as
    | Array<{ platform: string; strategy: string }>
    | undefined;
  const recommendedSequence = idea.recommendedSequenceJson as
    | Array<{ platform: string; contentType: string; order: number }>
    | undefined;

  return (
    <div className="flex w-full max-w-xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Campaign idea</h1>
        <Badge variant={idea.approved ? "default" : "secondary"}>
          {idea.approved ? "Approved" : "Pending review"}
        </Badge>
      </div>

      {/* Keyed by rawAiOutput so editing state resets cleanly after a regenerate
          produces fresh content, instead of syncing via a useEffect. */}
      <IdeaEditForm
        key={idea.rawAiOutput}
        idea={idea}
        onSave={async (patch) => {
          await updateCampaignIdea({ campaignId, ...patch });
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Generated details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <p>
            <span className="font-medium">Target audience: </span>
            {idea.targetAudience}
          </p>
          <p>
            <span className="font-medium">Tone: </span>
            {idea.tone}
          </p>
          <p>
            <span className="font-medium">Engagement strategy: </span>
            {idea.engagementStrategy}
          </p>
          {platformStrategy && (
            <div>
              <p className="font-medium">Platform strategy:</p>
              <ul className="list-disc pl-5">
                {platformStrategy.map(({ platform, strategy }) => (
                  <li key={platform}>
                    {platform}: {strategy}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {recommendedSequence && recommendedSequence.length > 0 && (
            <div>
              <p className="font-medium">Recommended sequence:</p>
              <ol className="list-decimal pl-5">
                {[...recommendedSequence]
                  .sort((a, b) => a.order - b.order)
                  .map((step, i) => (
                    <li key={i}>
                      {step.platform} — {step.contentType}
                    </li>
                  ))}
              </ol>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2 flex-wrap">
        <Button onClick={handleApprove} disabled={idea.approved}>
          {idea.approved ? "Approved" : "Approve"}
        </Button>
        <Button variant="outline" onClick={handleRegenerate} disabled={regenerating}>
          {regenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {regenerating ? "Regenerating…" : "Regenerate"}
        </Button>
        <Button
          onClick={handleGenerateSequence}
          disabled={!idea.approved || generatingSequence}
          className="ml-auto"
        >
          {generatingSequence && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {generatingSequence ? "Generating…" : "Generate full sequence"}
        </Button>
      </div>
    </div>
  );
}
