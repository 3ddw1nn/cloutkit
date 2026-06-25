"use client";

import { useAction, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { api } from "@cloutkit/backend/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TARGET_PLATFORMS, CAMPAIGN_TYPES, formatEnumLabel } from "../lib";

type Platform = (typeof TARGET_PLATFORMS)[number];

export function NewCampaignForm() {
  const createCampaign = useMutation(api.campaigns.createCampaign);
  const generateCampaignIdea = useAction(api.campaignActions.generateCampaignIdea);
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [inputTopic, setInputTopic] = useState("");
  const [objective, setObjective] = useState("");
  const [campaignType, setCampaignType] = useState<string>(CAMPAIGN_TYPES[0]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function togglePlatform(platform: Platform) {
    setPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform],
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !inputTopic.trim() || platforms.length === 0) return;

    setSubmitting(true);
    try {
      const campaignId = await createCampaign({
        title,
        inputTopic,
        objective: objective || undefined,
        campaignType: campaignType as (typeof CAMPAIGN_TYPES)[number],
        selectedPlatforms: platforms,
        notes: notes || undefined,
      });

      toast.info("Generating campaign idea…");
      await generateCampaignIdea({ campaignId });
      router.push(`/campaigns/${campaignId}/idea`);
    } catch {
      toast.error("Could not generate a campaign idea. Check your API key in Settings.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>New campaign</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="inputTopic">Topic</Label>
            <Textarea
              id="inputTopic"
              value={inputTopic}
              onChange={(e) => setInputTopic(e.target.value)}
              placeholder="e.g. I'm launching my new app on Product Hunt."
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="objective">Objective (optional)</Label>
            <Input id="objective" value={objective} onChange={(e) => setObjective(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="campaignType">Campaign type</Label>
            <Select value={campaignType} onValueChange={(v) => v !== null && setCampaignType(v)}>
              <SelectTrigger id="campaignType" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CAMPAIGN_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {formatEnumLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Platforms</Label>
            <div className="flex flex-wrap gap-4">
              {TARGET_PLATFORMS.map((platform) => (
                <label key={platform} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={platforms.includes(platform)}
                    onCheckedChange={() => togglePlatform(platform)}
                  />
                  {platform}
                </label>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <Button
            type="submit"
            disabled={submitting || !title.trim() || !inputTopic.trim() || platforms.length === 0}
          >
            {submitting ? "Generating…" : "Generate campaign idea"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
