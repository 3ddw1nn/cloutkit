"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@cloutkit/backend/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function DashboardContent() {
  const workspace = useQuery(api.workspaces.getCurrentWorkspace);
  const { signOut } = useAuthActions();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/signin");
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-8 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {workspace === undefined
              ? "Loading…"
              : workspace?.name ?? "Dashboard"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {workspace ? `Your role: ${workspace.role}` : ""}
          </p>
        </div>
        <Button variant="outline" onClick={handleSignOut}>
          Sign out
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Onboarding</CardTitle>
            <CardDescription>Coming in Phase 2</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Brand identity, audience, and voice questions.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>API keys</CardTitle>
            <CardDescription>Coming in Phase 3</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Bring your own encrypted AI provider key.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Campaigns</CardTitle>
            <CardDescription>Coming in Phase 4</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Generate and approve campaign sequences.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Approval queue</CardTitle>
            <CardDescription>Coming in Phase 5–7</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Review drafts, mock publish, and engagement waves.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
