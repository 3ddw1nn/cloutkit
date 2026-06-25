"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  const brandIdentity = useQuery(api.brandIdentity.getBrandIdentity);
  const apiKeys = useQuery(api.apiKeys.listApiKeys);
  const campaigns = useQuery(api.campaigns.getCampaigns, {});
  const { signOut } = useAuthActions();
  const router = useRouter();
  const hasActiveKey = apiKeys?.some((key) => key.status === "ACTIVE");

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
            <CardDescription>Complete</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {brandIdentity
              ? `Brand profile saved for "${brandIdentity.brandName}".`
              : "Brand identity, audience, and voice questions."}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>API keys</CardTitle>
            <CardDescription>{hasActiveKey ? "Connected" : "Not connected yet"}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Bring your own encrypted AI provider key.{" "}
            <Link href="/settings/api-keys" className="underline">
              Manage keys
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Campaigns</CardTitle>
            <CardDescription>
              {campaigns === undefined ? "Loading…" : `${campaigns.length} total`}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Generate and approve campaign sequences.{" "}
            <Link href="/campaigns" className="underline">
              View campaigns
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Engagement routine</CardTitle>
            <CardDescription>Daily outbound engagement</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Set daily engagement targets and approve opportunities.{" "}
            <Link href="/settings/engagement" className="underline">
              Configure routine
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
