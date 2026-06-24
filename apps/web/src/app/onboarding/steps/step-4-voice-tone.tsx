"use client";

import { useState } from "react";
import { StepShell } from "../step-shell";
import { TONE_OPTIONS, StepAnswers } from "../lib";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={(v) => v !== null && onChange(v)}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function Step4VoiceTone({
  initialAnswers,
  onNext,
  onBack,
}: {
  initialAnswers: StepAnswers | undefined;
  onNext: (answers: Record<string, unknown>) => void;
  onBack: () => void;
}) {
  const [tone, setTone] = useState<string[]>(initialAnswers?.tone ?? []);
  const [writingStyle, setWritingStyle] = useState(initialAnswers?.writingStyle ?? "");
  const [emojiPreference, setEmojiPreference] = useState(
    initialAnswers?.emojiPreference ?? "Light",
  );
  const [humorLevel, setHumorLevel] = useState(initialAnswers?.humorLevel ?? "Subtle");
  const [formalityLevel, setFormalityLevel] = useState(
    initialAnswers?.formalityLevel ?? "Neutral",
  );
  const [technicalDepth, setTechnicalDepth] = useState(
    initialAnswers?.technicalDepth ?? "Balanced",
  );
  const [personalVsCompanyVoice, setPersonalVsCompanyVoice] = useState(
    initialAnswers?.personalVsCompanyVoice ?? "Blended",
  );

  function toggleTone(option: string) {
    setTone((prev) =>
      prev.includes(option) ? prev.filter((t) => t !== option) : [...prev, option],
    );
  }

  return (
    <StepShell
      step={4}
      title="Voice and tone"
      description="How should your content sound?"
      onBack={onBack}
      onNext={() =>
        onNext({
          tone,
          writingStyle,
          emojiPreference,
          humorLevel,
          formalityLevel,
          technicalDepth,
          personalVsCompanyVoice,
        })
      }
    >
      <div className="flex flex-col gap-2">
        <Label>Tone (select any that fit)</Label>
        <div className="flex flex-wrap gap-2">
          {TONE_OPTIONS.map((option) => (
            <Button
              key={option}
              type="button"
              size="sm"
              variant={tone.includes(option) ? "default" : "outline"}
              onClick={() => toggleTone(option)}
            >
              {option}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="writingStyle">Writing style</Label>
        <Input
          id="writingStyle"
          value={writingStyle}
          onChange={(e) => setWritingStyle(e.target.value)}
          placeholder="e.g. short punchy sentences, storytelling, listicles"
        />
      </div>
      <SelectField
        id="emojiPreference"
        label="Emoji preference"
        value={emojiPreference}
        onChange={setEmojiPreference}
        options={["None", "Light", "Frequent"]}
      />
      <SelectField
        id="humorLevel"
        label="Humor level"
        value={humorLevel}
        onChange={setHumorLevel}
        options={["None", "Subtle", "Moderate", "High"]}
      />
      <SelectField
        id="formalityLevel"
        label="Formality level"
        value={formalityLevel}
        onChange={setFormalityLevel}
        options={["Casual", "Neutral", "Formal"]}
      />
      <SelectField
        id="technicalDepth"
        label="Technical depth"
        value={technicalDepth}
        onChange={setTechnicalDepth}
        options={["Beginner-friendly", "Balanced", "Highly technical"]}
      />
      <SelectField
        id="personalVsCompanyVoice"
        label="Personal vs. company voice"
        value={personalVsCompanyVoice}
        onChange={setPersonalVsCompanyVoice}
        options={["Personal", "Company", "Blended"]}
      />
    </StepShell>
  );
}
