import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export const TOTAL_STEPS = 10;

export function StepShell({
  step,
  title,
  description,
  children,
  onBack,
  onNext,
  onSkip,
  nextLabel = "Next",
  nextDisabled = false,
}: {
  step: number;
  title: string;
  description: string;
  children: ReactNode;
  onBack?: () => void;
  onNext: () => void;
  onSkip?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
}) {
  return (
    <div className="flex w-full max-w-xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          Step {step} of {TOTAL_STEPS}
        </p>
        <Progress value={(step / TOTAL_STEPS) * 100} />
      </div>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
      <div className="flex items-center justify-between pt-2">
        <div>
          {onBack && (
            <Button type="button" variant="outline" onClick={onBack}>
              Back
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {onSkip && (
            <Button type="button" variant="ghost" onClick={onSkip}>
              Skip for now
            </Button>
          )}
          <Button type="button" onClick={onNext} disabled={nextDisabled}>
            {nextLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
