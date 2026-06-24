"use client";

import { useState } from "react";
import { StepShell } from "../step-shell";
import { parseLines, joinLines, StepAnswers } from "../lib";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function Step2BrandIdentity({
  initialAnswers,
  onNext,
  onBack,
}: {
  initialAnswers: StepAnswers | undefined;
  onNext: (answers: Record<string, unknown>) => void;
  onBack: () => void;
}) {
  const [knownFor, setKnownFor] = useState(initialAnswers?.knownFor ?? "");
  const [mission, setMission] = useState(initialAnswers?.mission ?? "");
  const [differentiation, setDifferentiation] = useState(
    initialAnswers?.differentiation ?? "",
  );
  const [productsServices, setProductsServices] = useState(
    initialAnswers?.productsServices ?? "",
  );
  const [goals, setGoals] = useState(joinLines(initialAnswers?.goals));

  return (
    <StepShell
      step={2}
      title="Brand identity"
      description="What makes you, you?"
      onBack={onBack}
      onNext={() =>
        onNext({
          knownFor,
          mission,
          differentiation,
          productsServices,
          goals: parseLines(goals),
        })
      }
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="knownFor">What do you want to be known for?</Label>
        <Textarea id="knownFor" value={knownFor} onChange={(e) => setKnownFor(e.target.value)} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="mission">What is your mission?</Label>
        <Textarea id="mission" value={mission} onChange={(e) => setMission(e.target.value)} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="differentiation">What makes you different?</Label>
        <Textarea
          id="differentiation"
          value={differentiation}
          onChange={(e) => setDifferentiation(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="productsServices">What products/services do you promote?</Label>
        <Textarea
          id="productsServices"
          value={productsServices}
          onChange={(e) => setProductsServices(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="goals">What are your main goals? (one per line)</Label>
        <Textarea id="goals" value={goals} onChange={(e) => setGoals(e.target.value)} rows={3} />
      </div>
    </StepShell>
  );
}
