"use client";

import { StepShell } from "../step-shell";
import { Card, CardContent } from "@/components/ui/card";

export function Step8ApiKeysPlaceholder({
  onNext,
  onBack,
}: {
  onNext: (answers: Record<string, unknown>) => void;
  onBack: () => void;
}) {
  return (
    <StepShell
      step={8}
      title="API keys"
      description="Bring your own AI provider key so campaign generation runs on your account."
      onBack={onBack}
      nextLabel="Skip for now"
      onNext={() => onNext({ skipped: true })}
    >
      <Card>
        <CardContent className="text-sm text-muted-foreground">
          API key setup isn&apos;t built yet — you&apos;ll be able to add your OpenAI key from
          Settings once it&apos;s ready. Skip this for now and continue.
        </CardContent>
      </Card>
    </StepShell>
  );
}
