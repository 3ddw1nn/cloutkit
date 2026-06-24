"use client";

import { useState } from "react";
import { StepShell } from "../step-shell";
import { StepAnswers } from "../lib";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const TOGGLES: Array<{
  key: string;
  label: string;
  description: string;
  defaultValue: boolean;
}> = [
  {
    key: "requireApprovalBeforePublishing",
    label: "Require approval before publishing",
    description: "Posts must be approved before they go out.",
    defaultValue: true,
  },
  {
    key: "requireApprovalBeforeComments",
    label: "Require approval before comments",
    description: "AI-suggested comments need your sign-off before posting.",
    defaultValue: true,
  },
  {
    key: "requireApprovalBeforeFollows",
    label: "Require approval before follows",
    description: "Following other accounts needs your sign-off.",
    defaultValue: true,
  },
  {
    key: "requireApprovalBeforeLikes",
    label: "Require approval before likes",
    description: "Liking other posts needs your sign-off.",
    defaultValue: true,
  },
  {
    key: "requireApprovalBeforeReposts",
    label: "Require approval before reposts",
    description: "Reposting/quoting needs your sign-off.",
    defaultValue: true,
  },
  {
    key: "allowSchedulingAfterApproval",
    label: "Allow scheduling after approval",
    description: "Once approved, posts can be scheduled for later.",
    defaultValue: true,
  },
  {
    key: "allowAutoPublishScheduledApprovedPosts",
    label: "Auto-publish scheduled, approved posts",
    description: "Skip a final manual click when a scheduled time arrives.",
    defaultValue: false,
  },
];

export function Step7ApprovalPreferences({
  initialAnswers,
  onNext,
  onBack,
}: {
  initialAnswers: StepAnswers | undefined;
  onNext: (answers: Record<string, unknown>) => void;
  onBack: () => void;
}) {
  const [values, setValues] = useState<Record<string, boolean>>(() => {
    const state: Record<string, boolean> = {};
    for (const toggle of TOGGLES) {
      state[toggle.key] = initialAnswers?.[toggle.key] ?? toggle.defaultValue;
    }
    return state;
  });

  return (
    <StepShell
      step={7}
      title="Approval preferences"
      description="By default, every public action requires your approval. You can loosen this later."
      onBack={onBack}
      onNext={() => onNext(values)}
    >
      {TOGGLES.map((toggle) => (
        <div key={toggle.key} className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor={toggle.key}>{toggle.label}</Label>
            <p className="text-sm text-muted-foreground">{toggle.description}</p>
          </div>
          <Switch
            id={toggle.key}
            checked={values[toggle.key]}
            onCheckedChange={(checked) =>
              setValues((prev) => ({ ...prev, [toggle.key]: checked }))
            }
          />
        </div>
      ))}
    </StepShell>
  );
}
