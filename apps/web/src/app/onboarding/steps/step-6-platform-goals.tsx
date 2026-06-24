"use client";

import { useState } from "react";
import { StepShell } from "../step-shell";
import { TARGET_PLATFORMS, parseLines, joinLines, StepAnswers } from "../lib";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Platform = (typeof TARGET_PLATFORMS)[number];

type PlatformGoalState = {
  enabled: boolean;
  goal: string;
  contentTypes: string;
  postingFrequency: string;
  stylePreference: string;
};

const FREQUENCIES = ["Daily", "A few times a week", "Weekly", "Occasionally"];

function defaultState(initial: StepAnswers | undefined): PlatformGoalState {
  return {
    enabled: initial?.enabled ?? false,
    goal: initial?.goal ?? "",
    contentTypes: joinLines(initial?.contentTypes),
    postingFrequency: initial?.postingFrequency ?? "Weekly",
    stylePreference: initial?.stylePreference ?? "",
  };
}

export function Step6PlatformGoals({
  initialAnswers,
  onNext,
  onBack,
}: {
  initialAnswers: StepAnswers | undefined;
  onNext: (answers: Record<string, unknown>) => void;
  onBack: () => void;
}) {
  const initialPlatforms = initialAnswers?.platforms ?? {};
  const [platforms, setPlatforms] = useState<Record<Platform, PlatformGoalState>>(() => {
    const state = {} as Record<Platform, PlatformGoalState>;
    for (const platform of TARGET_PLATFORMS) {
      state[platform] = defaultState(initialPlatforms[platform]);
    }
    return state;
  });

  function update(platform: Platform, patch: Partial<PlatformGoalState>) {
    setPlatforms((prev) => ({ ...prev, [platform]: { ...prev[platform], ...patch } }));
  }

  return (
    <StepShell
      step={6}
      title="Platform goals"
      description="Enable the platforms you want to post to and set a goal for each."
      onBack={onBack}
      onNext={() =>
        onNext({
          platforms: Object.fromEntries(
            TARGET_PLATFORMS.map((platform) => [
              platform,
              {
                ...platforms[platform],
                contentTypes: parseLines(platforms[platform].contentTypes),
              },
            ]),
          ),
        })
      }
    >
      {TARGET_PLATFORMS.map((platform) => {
        const state = platforms[platform];
        return (
          <Card key={platform}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{platform}</CardTitle>
              <Switch
                checked={state.enabled}
                onCheckedChange={(enabled) => update(platform, { enabled })}
              />
            </CardHeader>
            {state.enabled && (
              <CardContent className="flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`${platform}-goal`}>Goal</Label>
                  <Input
                    id={`${platform}-goal`}
                    value={state.goal}
                    onChange={(e) => update(platform, { goal: e.target.value })}
                    placeholder="e.g. grow followers, drive sign-ups"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`${platform}-contentTypes`}>
                    Content types (one per line)
                  </Label>
                  <Input
                    id={`${platform}-contentTypes`}
                    value={state.contentTypes}
                    onChange={(e) => update(platform, { contentTypes: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`${platform}-frequency`}>Posting frequency</Label>
                  <Select
                    value={state.postingFrequency}
                    onValueChange={(postingFrequency) =>
                      postingFrequency !== null && update(platform, { postingFrequency })
                    }
                  >
                    <SelectTrigger id={`${platform}-frequency`} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCIES.map((freq) => (
                        <SelectItem key={freq} value={freq}>
                          {freq}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`${platform}-style`}>Style preference</Label>
                  <Input
                    id={`${platform}-style`}
                    value={state.stylePreference}
                    onChange={(e) => update(platform, { stylePreference: e.target.value })}
                  />
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </StepShell>
  );
}
