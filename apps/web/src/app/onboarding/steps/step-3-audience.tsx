"use client";

import { useState } from "react";
import { StepShell } from "../step-shell";
import { parseLines, joinLines, StepAnswers } from "../lib";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const KNOWLEDGE_LEVELS = ["Beginner", "Intermediate", "Advanced", "Mixed"];

export function Step3Audience({
  initialAnswers,
  onNext,
  onBack,
}: {
  initialAnswers: StepAnswers | undefined;
  onNext: (answers: Record<string, unknown>) => void;
  onBack: () => void;
}) {
  const [targetAudience, setTargetAudience] = useState(
    initialAnswers?.targetAudience ?? "",
  );
  const [audienceProblems, setAudienceProblems] = useState(
    joinLines(initialAnswers?.audienceProblems),
  );
  const [audienceInterests, setAudienceInterests] = useState(
    joinLines(initialAnswers?.audienceInterests),
  );
  const [audienceKnowledgeLevel, setAudienceKnowledgeLevel] = useState(
    initialAnswers?.audienceKnowledgeLevel ?? "Mixed",
  );
  const [audienceLocation, setAudienceLocation] = useState(
    initialAnswers?.audienceLocation ?? "",
  );

  return (
    <StepShell
      step={3}
      title="Target audience"
      description="Who are you creating content for?"
      onBack={onBack}
      onNext={() =>
        onNext({
          targetAudience,
          audienceProblems: parseLines(audienceProblems),
          audienceInterests: parseLines(audienceInterests),
          audienceKnowledgeLevel,
          audienceLocation,
        })
      }
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="targetAudience">Describe your target audience</Label>
        <Textarea
          id="targetAudience"
          value={targetAudience}
          onChange={(e) => setTargetAudience(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="audienceProblems">Audience problems (one per line)</Label>
        <Textarea
          id="audienceProblems"
          value={audienceProblems}
          onChange={(e) => setAudienceProblems(e.target.value)}
          rows={3}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="audienceInterests">Audience interests (one per line)</Label>
        <Textarea
          id="audienceInterests"
          value={audienceInterests}
          onChange={(e) => setAudienceInterests(e.target.value)}
          rows={3}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="audienceKnowledgeLevel">Audience knowledge level</Label>
        <Select
          value={audienceKnowledgeLevel}
          onValueChange={(v) => v !== null && setAudienceKnowledgeLevel(v)}
        >
          <SelectTrigger id="audienceKnowledgeLevel" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KNOWLEDGE_LEVELS.map((level) => (
              <SelectItem key={level} value={level}>
                {level}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="audienceLocation">Audience location (optional)</Label>
        <Input
          id="audienceLocation"
          value={audienceLocation}
          onChange={(e) => setAudienceLocation(e.target.value)}
        />
      </div>
    </StepShell>
  );
}
