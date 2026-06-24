"use client";

import { useState } from "react";
import { StepShell } from "../step-shell";
import { BRAND_TYPES, StepAnswers } from "../lib";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function Step1BrandBasics({
  initialAnswers,
  onNext,
}: {
  initialAnswers: StepAnswers | undefined;
  onNext: (answers: Record<string, unknown>) => void;
}) {
  const [brandName, setBrandName] = useState(initialAnswers?.brandName ?? "");
  const [brandType, setBrandType] = useState(initialAnswers?.brandType ?? "OTHER");
  const [websiteUrl, setWebsiteUrl] = useState(initialAnswers?.websiteUrl ?? "");
  const [shortBio, setShortBio] = useState(initialAnswers?.shortBio ?? "");
  const [industry, setIndustry] = useState(initialAnswers?.industry ?? "");

  return (
    <StepShell
      step={1}
      title="Brand basics"
      description="Tell us the fundamentals of what you're building."
      nextDisabled={!brandName.trim() || !shortBio.trim()}
      onNext={() =>
        onNext({ brandName, brandType, websiteUrl, shortBio, industry })
      }
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="brandName">Brand name</Label>
        <Input id="brandName" value={brandName} onChange={(e) => setBrandName(e.target.value)} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="brandType">Brand type</Label>
        <Select value={brandType} onValueChange={(v) => v !== null && setBrandType(v)}>
          <SelectTrigger id="brandType" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BRAND_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type.replaceAll("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="websiteUrl">Website URL (optional)</Label>
        <Input
          id="websiteUrl"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="industry">Industry / niche (optional)</Label>
        <Input id="industry" value={industry} onChange={(e) => setIndustry(e.target.value)} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="shortBio">Short bio</Label>
        <Textarea
          id="shortBio"
          value={shortBio}
          onChange={(e) => setShortBio(e.target.value)}
          rows={3}
        />
      </div>
    </StepShell>
  );
}
