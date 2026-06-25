"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@cloutkit/backend/convex/_generated/api";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { OpportunityCard } from "@/components/opportunity-card";

export function EngagementRoutineContent() {
  const routineSettings = useQuery(api.engagement.getRoutineSettings);
  const routineOpportunities = useQuery(api.engagement.getRoutineOpportunities);
  const updateSettings = useMutation(api.engagement.updateRoutineSettings);
  const approveOpp = useMutation(api.engagement.approveOpportunity);
  const rejectOpp = useMutation(api.engagement.rejectOpportunity);
  const updateOppText = useMutation(api.engagement.updateOpportunityText);
  const generateQueue = useAction(api.engagementActions.generateRoutineEngagementQueue);

  const [enabled, setEnabled] = useState(routineSettings?.enabled ?? true);
  const [comments, setComments] = useState(routineSettings?.commentsPerDay ?? 5);
  const [likes, setLikes] = useState(routineSettings?.likesPerDay ?? 5);
  const [follows, setFollows] = useState(routineSettings?.followsPerDay ?? 5);
  const [replies, setReplies] = useState(routineSettings?.repliesPerDay ?? 5);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await updateSettings({
        enabled,
        commentsPerDay: comments,
        likesPerDay: likes,
        followsPerDay: follows,
        repliesPerDay: replies,
      });
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateQueue = async () => {
    setIsGenerating(true);
    try {
      await generateQueue({});
      toast.success("Engagement queue generated!");
    } catch {
      toast.error("Failed to generate engagement queue");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Daily Engagement Routine</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure your daily outbound engagement targets and generate approval queues.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Routine settings</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="enabled">Enable daily routine</Label>
            <Switch
              id="enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
              disabled={isSaving}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="comments">Comments per day</Label>
              <Input
                id="comments"
                type="number"
                min="0"
                value={comments}
                onChange={(e) => setComments(parseInt(e.target.value) || 0)}
                disabled={isSaving || !enabled}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="likes">Likes per day</Label>
              <Input
                id="likes"
                type="number"
                min="0"
                value={likes}
                onChange={(e) => setLikes(parseInt(e.target.value) || 0)}
                disabled={isSaving || !enabled}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="follows">Follows per day</Label>
              <Input
                id="follows"
                type="number"
                min="0"
                value={follows}
                onChange={(e) => setFollows(parseInt(e.target.value) || 0)}
                disabled={isSaving || !enabled}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="replies">Replies per day</Label>
              <Input
                id="replies"
                type="number"
                min="0"
                value={replies}
                onChange={(e) => setReplies(parseInt(e.target.value) || 0)}
                disabled={isSaving || !enabled}
              />
            </div>
          </div>

          <Button onClick={handleSaveSettings} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save settings
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Today&rsquo;s engagement queue</CardTitle>
          <Button
            size="sm"
            onClick={handleGenerateQueue}
            disabled={isGenerating || !enabled}
          >
            {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isGenerating ? "Generating…" : "Generate queue"}
          </Button>
        </CardHeader>
        <CardContent>
          {!routineOpportunities || routineOpportunities.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No opportunities generated yet. Click &ldquo;Generate queue&rdquo; to create today&rsquo;s engagement plan.
            </p>
          ) : (
            <div className="space-y-4">
              {routineOpportunities.map((opp) => (
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
        </CardContent>
      </Card>
    </div>
  );
}
