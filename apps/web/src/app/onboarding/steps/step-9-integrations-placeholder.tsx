"use client";

import { StepShell } from "../step-shell";
import { Card, CardContent } from "@/components/ui/card";

export function Step9IntegrationsPlaceholder({
  onNext,
  onBack,
}: {
  onNext: (answers: Record<string, unknown>) => void;
  onBack: () => void;
}) {
  return (
    <StepShell
      step={9}
      title="Social integrations"
      description="Connect your social accounts to publish directly."
      onBack={onBack}
      nextLabel="Skip for now"
      onNext={() => onNext({ skipped: true })}
    >
      <Card>
        <CardContent className="text-sm text-muted-foreground">
          Social account connections aren&apos;t built yet — you&apos;ll be able to connect
          Instagram, Facebook, X, and YouTube from Settings once it&apos;s ready. Skip this for
          now and continue.
        </CardContent>
      </Card>
    </StepShell>
  );
}
