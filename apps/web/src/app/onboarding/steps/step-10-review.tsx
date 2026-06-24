"use client";

import { useState } from "react";
import { StepShell } from "../step-shell";
import { TARGET_PLATFORMS, StepAnswers } from "../lib";
import { Card, CardContent } from "@/components/ui/card";

export function Step10Review({
  responses,
  onFinish,
  onBack,
}: {
  responses: StepAnswers;
  onFinish: () => Promise<void>;
  onBack: () => void;
}) {
  const [finishing, setFinishing] = useState(false);
  const step1 = responses.step1 ?? {};
  const step2 = responses.step2 ?? {};
  const step3 = responses.step3 ?? {};
  const step4 = responses.step4 ?? {};
  const step6 = responses.step6 ?? {};

  const enabledPlatforms = TARGET_PLATFORMS.filter(
    (platform) => step6.platforms?.[platform]?.enabled,
  );

  async function handleFinish() {
    setFinishing(true);
    try {
      await onFinish();
    } finally {
      setFinishing(false);
    }
  }

  return (
    <StepShell
      step={10}
      title="Review"
      description="Here's the brand profile we'll save. Use Back to edit any step."
      onBack={onBack}
      nextLabel={finishing ? "Saving…" : "Finish"}
      nextDisabled={finishing}
      onNext={handleFinish}
    >
      <Card>
        <CardContent className="flex flex-col gap-3 text-sm">
          <div>
            <p className="font-medium">{step1.brandName || "Untitled brand"}</p>
            <p className="text-muted-foreground">
              {step1.brandType?.replaceAll("_", " ") ?? "OTHER"}
              {step1.industry ? ` · ${step1.industry}` : ""}
            </p>
          </div>
          {step1.shortBio && <p>{step1.shortBio}</p>}
          {step2.mission && (
            <p>
              <span className="font-medium">Mission: </span>
              {step2.mission}
            </p>
          )}
          {step3.targetAudience && (
            <p>
              <span className="font-medium">Audience: </span>
              {step3.targetAudience}
            </p>
          )}
          {step4.tone?.length > 0 && (
            <p>
              <span className="font-medium">Tone: </span>
              {step4.tone.join(", ")}
            </p>
          )}
          <p>
            <span className="font-medium">Platforms enabled: </span>
            {enabledPlatforms.length > 0 ? enabledPlatforms.join(", ") : "None yet"}
          </p>
        </CardContent>
      </Card>
    </StepShell>
  );
}
