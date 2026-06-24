"use client";

import { useState } from "react";
import { StepShell } from "../step-shell";
import { parseLines, joinLines, StepAnswers } from "../lib";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function LinesField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label} (one per line)</Label>
      <Textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} rows={3} />
    </div>
  );
}

export function Step5ContentPreferences({
  initialAnswers,
  onNext,
  onBack,
}: {
  initialAnswers: StepAnswers | undefined;
  onNext: (answers: Record<string, unknown>) => void;
  onBack: () => void;
}) {
  const [contentTypes, setContentTypes] = useState(joinLines(initialAnswers?.contentTypes));
  const [topics, setTopics] = useState(joinLines(initialAnswers?.topics));
  const [avoidedTopics, setAvoidedTopics] = useState(joinLines(initialAnswers?.avoidedTopics));
  const [examplePosts, setExamplePosts] = useState(joinLines(initialAnswers?.examplePosts));
  const [wordsToUse, setWordsToUse] = useState(joinLines(initialAnswers?.wordsToUse));
  const [wordsToAvoid, setWordsToAvoid] = useState(joinLines(initialAnswers?.wordsToAvoid));
  const [ctaPreferences, setCtaPreferences] = useState(
    joinLines(initialAnswers?.ctaPreferences),
  );

  return (
    <StepShell
      step={5}
      title="Content preferences"
      description="What should — and shouldn't — show up in your content?"
      onBack={onBack}
      onNext={() =>
        onNext({
          contentTypes: parseLines(contentTypes),
          topics: parseLines(topics),
          avoidedTopics: parseLines(avoidedTopics),
          examplePosts: parseLines(examplePosts),
          wordsToUse: parseLines(wordsToUse),
          wordsToAvoid: parseLines(wordsToAvoid),
          ctaPreferences: parseLines(ctaPreferences),
        })
      }
    >
      <LinesField
        id="contentTypes"
        label="Preferred content types"
        value={contentTypes}
        onChange={setContentTypes}
      />
      <LinesField id="topics" label="Topics to post about" value={topics} onChange={setTopics} />
      <LinesField
        id="avoidedTopics"
        label="Topics to avoid"
        value={avoidedTopics}
        onChange={setAvoidedTopics}
      />
      <LinesField
        id="examplePosts"
        label="Example posts you like"
        value={examplePosts}
        onChange={setExamplePosts}
      />
      <LinesField
        id="wordsToUse"
        label="Words/phrases to use"
        value={wordsToUse}
        onChange={setWordsToUse}
      />
      <LinesField
        id="wordsToAvoid"
        label="Words/phrases to avoid"
        value={wordsToAvoid}
        onChange={setWordsToAvoid}
      />
      <LinesField
        id="ctaPreferences"
        label="Call-to-action preferences"
        value={ctaPreferences}
        onChange={setCtaPreferences}
      />
    </StepShell>
  );
}
