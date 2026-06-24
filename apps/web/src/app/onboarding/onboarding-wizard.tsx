"use client";

import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@cloutkit/backend/convex/_generated/api";
import { Step1BrandBasics } from "./steps/step-1-brand-basics";
import { Step2BrandIdentity } from "./steps/step-2-brand-identity";
import { Step3Audience } from "./steps/step-3-audience";
import { Step4VoiceTone } from "./steps/step-4-voice-tone";
import { Step5ContentPreferences } from "./steps/step-5-content-preferences";
import { Step6PlatformGoals } from "./steps/step-6-platform-goals";
import { Step7ApprovalPreferences } from "./steps/step-7-approval-preferences";
import { Step8ApiKeysPlaceholder } from "./steps/step-8-api-keys-placeholder";
import { Step9IntegrationsPlaceholder } from "./steps/step-9-integrations-placeholder";
import { Step10Review } from "./steps/step-10-review";

export function OnboardingWizard() {
  const progress = useQuery(api.onboarding.getOnboardingProgress);
  const saveStep = useMutation(api.onboarding.saveOnboardingStep);
  const completeOnboarding = useMutation(api.onboarding.completeOnboarding);
  const router = useRouter();

  const [step, setStep] = useState<number | null>(null);

  if (progress === undefined || progress === null) {
    return <p className="text-muted-foreground">Loading…</p>;
  }

  const currentStep = step ?? Math.min(Math.max(progress.currentStep, 1), 10);
  const responses = progress.responsesJson ?? {};

  async function handleNext(stepNumber: number, answers: Record<string, unknown>) {
    await saveStep({ step: stepNumber, answers });
    setStep(stepNumber + 1);
  }

  async function handleFinish() {
    await completeOnboarding();
    router.push("/dashboard");
  }

  const back = (target: number) => () => setStep(target);

  switch (currentStep) {
    case 1:
      return (
        <Step1BrandBasics
          initialAnswers={responses.step1}
          onNext={(answers) => handleNext(1, answers)}
        />
      );
    case 2:
      return (
        <Step2BrandIdentity
          initialAnswers={responses.step2}
          onNext={(answers) => handleNext(2, answers)}
          onBack={back(1)}
        />
      );
    case 3:
      return (
        <Step3Audience
          initialAnswers={responses.step3}
          onNext={(answers) => handleNext(3, answers)}
          onBack={back(2)}
        />
      );
    case 4:
      return (
        <Step4VoiceTone
          initialAnswers={responses.step4}
          onNext={(answers) => handleNext(4, answers)}
          onBack={back(3)}
        />
      );
    case 5:
      return (
        <Step5ContentPreferences
          initialAnswers={responses.step5}
          onNext={(answers) => handleNext(5, answers)}
          onBack={back(4)}
        />
      );
    case 6:
      return (
        <Step6PlatformGoals
          initialAnswers={responses.step6}
          onNext={(answers) => handleNext(6, answers)}
          onBack={back(5)}
        />
      );
    case 7:
      return (
        <Step7ApprovalPreferences
          initialAnswers={responses.step7}
          onNext={(answers) => handleNext(7, answers)}
          onBack={back(6)}
        />
      );
    case 8:
      return (
        <Step8ApiKeysPlaceholder onNext={(answers) => handleNext(8, answers)} onBack={back(7)} />
      );
    case 9:
      return (
        <Step9IntegrationsPlaceholder
          onNext={(answers) => handleNext(9, answers)}
          onBack={back(8)}
        />
      );
    case 10:
    default:
      return <Step10Review responses={responses} onFinish={handleFinish} onBack={back(9)} />;
  }
}
