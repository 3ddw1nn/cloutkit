"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { api } from "@cloutkit/backend/convex/_generated/api";
import type { Id } from "@cloutkit/backend/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

function statusVariant(status: string): "default" | "destructive" | "secondary" {
  if (status === "ACTIVE") return "default";
  if (status === "INVALID") return "destructive";
  return "secondary";
}

export function SocialAccountsContent() {
  const connections = useQuery(api.socialConnections.listConnections);
  const connectX = useAction(api.socialConnectionActions.connectXAccount);
  const connectFacebook = useAction(api.socialConnectionActions.connectFacebookAccount);
  const connectInstagram = useAction(api.socialConnectionActions.connectInstagramAccount);
  const connectYoutube = useAction(api.socialConnectionActions.connectYoutubeAccount);
  const testConnection = useAction(api.socialConnectionActions.testConnection);
  const testFacebookConnection = useAction(api.socialConnectionActions.testFacebookConnection);
  const testInstagramConnection = useAction(api.socialConnectionActions.testInstagramConnection);
  const testYoutubeConnection = useAction(api.socialConnectionActions.testYoutubeConnection);
  const deleteConnection = useMutation(api.socialConnections.deleteConnection);

  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [accessTokenSecret, setAccessTokenSecret] = useState("");
  const [facebookToken, setFacebookToken] = useState("");
  const [pageAccessToken, setPageAccessToken] = useState("");
  const [pageId, setPageId] = useState("");
  const [googleClientId, setGoogleClientId] = useState("");
  const [googleClientSecret, setGoogleClientSecret] = useState("");
  const [googleRefreshToken, setGoogleRefreshToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingFacebook, setSavingFacebook] = useState(false);
  const [savingInstagram, setSavingInstagram] = useState(false);
  const [savingYoutube, setSavingYoutube] = useState(false);
  const [testingId, setTestingId] = useState<Id<"socialConnections"> | null>(null);

  async function handleConnectX(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!apiKey.trim() || !apiSecret.trim() || !accessToken.trim() || !accessTokenSecret.trim()) {
      toast.error("All fields are required");
      return;
    }

    setSaving(true);
    try {
      await connectX({
        apiKey: apiKey.trim(),
        apiSecret: apiSecret.trim(),
        accessToken: accessToken.trim(),
        accessTokenSecret: accessTokenSecret.trim(),
      });
      setApiKey("");
      setApiSecret("");
      setAccessToken("");
      setAccessTokenSecret("");
      toast.success("X account connected");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not connect account";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleConnectFacebook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!facebookToken.trim()) {
      toast.error("Access token is required");
      return;
    }

    setSavingFacebook(true);
    try {
      await connectFacebook({ accessToken: facebookToken.trim() });
      setFacebookToken("");
      toast.success("Facebook account connected");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not connect account";
      toast.error(message);
    } finally {
      setSavingFacebook(false);
    }
  }

  async function handleConnectInstagram(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pageAccessToken.trim() || !pageId.trim()) {
      toast.error("Page Access Token and Page ID are required");
      return;
    }

    setSavingInstagram(true);
    try {
      await connectInstagram({
        pageAccessToken: pageAccessToken.trim(),
        pageId: pageId.trim(),
      });
      setPageAccessToken("");
      setPageId("");
      toast.success("Instagram account connected");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not connect account";
      toast.error(message);
    } finally {
      setSavingInstagram(false);
    }
  }

  async function handleConnectYoutube(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!googleClientId.trim() || !googleClientSecret.trim() || !googleRefreshToken.trim()) {
      toast.error("All fields are required");
      return;
    }

    setSavingYoutube(true);
    try {
      await connectYoutube({
        clientId: googleClientId.trim(),
        clientSecret: googleClientSecret.trim(),
        refreshToken: googleRefreshToken.trim(),
      });
      setGoogleClientId("");
      setGoogleClientSecret("");
      setGoogleRefreshToken("");
      toast.success("YouTube account connected");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not connect account";
      toast.error(message);
    } finally {
      setSavingYoutube(false);
    }
  }

  async function handleTest(id: Id<"socialConnections">, platform: string) {
    setTestingId(id);
    try {
      let testFn;
      if (platform === "FACEBOOK") {
        testFn = testFacebookConnection;
      } else if (platform === "INSTAGRAM") {
        testFn = testInstagramConnection;
      } else if (platform === "YOUTUBE") {
        testFn = testYoutubeConnection;
      } else {
        testFn = testConnection;
      }
      const result = await testFn({ connectionId: id });
      toast[result.success ? "success" : "error"](
        result.success ? "Connection is valid" : "Connection failed validation",
      );
    } catch {
      toast.error("Could not test connection");
    } finally {
      setTestingId(null);
    }
  }

  async function handleDelete(id: Id<"socialConnections">) {
    await deleteConnection({ id });
    toast.success("Connection removed");
  }

  return (
    <div className="flex w-full max-w-xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Social accounts</h1>
        <p className="text-muted-foreground">
          Connect your social media accounts to publish campaigns directly.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connect X (Twitter)</CardTitle>
          <CardDescription>
            Generate credentials from your X Developer App with Read and Write permissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleConnectX}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="From X Developer Portal"
                autoComplete="off"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="apiSecret">API Secret</Label>
              <Input
                id="apiSecret"
                type="password"
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                placeholder="From X Developer Portal"
                autoComplete="off"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="accessToken">Access Token</Label>
              <Input
                id="accessToken"
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="From X Developer App Settings"
                autoComplete="off"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="accessTokenSecret">Access Token Secret</Label>
              <Input
                id="accessTokenSecret"
                type="password"
                value={accessTokenSecret}
                onChange={(e) => setAccessTokenSecret(e.target.value)}
                placeholder="From X Developer App Settings"
                autoComplete="off"
              />
            </div>
            <Button type="submit" disabled={saving || !apiKey.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? "Connecting…" : "Connect account"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connect Facebook</CardTitle>
          <CardDescription>
            Generate an access token via Graph API Explorer with your own app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleConnectFacebook}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="facebookToken">Access Token</Label>
              <Input
                id="facebookToken"
                type="password"
                value={facebookToken}
                onChange={(e) => setFacebookToken(e.target.value)}
                placeholder="From Graph API Explorer"
                autoComplete="off"
              />
            </div>
            <Button type="submit" disabled={savingFacebook || !facebookToken.trim()}>
              {savingFacebook && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {savingFacebook ? "Connecting…" : "Connect account"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connect Instagram</CardTitle>
          <CardDescription>
            Your Instagram account must be linked to a Facebook Page in Business/Creator mode.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleConnectInstagram}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="pageId">Facebook Page ID</Label>
              <Input
                id="pageId"
                type="text"
                value={pageId}
                onChange={(e) => setPageId(e.target.value)}
                placeholder="e.g. 123456789"
                autoComplete="off"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="pageAccessToken">Page Access Token</Label>
              <Input
                id="pageAccessToken"
                type="password"
                value={pageAccessToken}
                onChange={(e) => setPageAccessToken(e.target.value)}
                placeholder="From Graph API Explorer"
                autoComplete="off"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Required permissions: pages_show_list, instagram_basic, instagram_content_publish,
              pages_read_engagement
            </p>
            <Button
              type="submit"
              disabled={savingInstagram || !pageAccessToken.trim() || !pageId.trim()}
            >
              {savingInstagram && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {savingInstagram ? "Connecting…" : "Connect account"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connect YouTube</CardTitle>
          <CardDescription>
            Create an OAuth Client in Google Cloud Console and generate a refresh token with the
            youtube.upload scope (e.g. via OAuth Playground using your own credentials).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleConnectYoutube}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="googleClientId">Client ID</Label>
              <Input
                id="googleClientId"
                type="password"
                value={googleClientId}
                onChange={(e) => setGoogleClientId(e.target.value)}
                placeholder="From Google Cloud Console"
                autoComplete="off"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="googleClientSecret">Client Secret</Label>
              <Input
                id="googleClientSecret"
                type="password"
                value={googleClientSecret}
                onChange={(e) => setGoogleClientSecret(e.target.value)}
                placeholder="From Google Cloud Console"
                autoComplete="off"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="googleRefreshToken">Refresh Token</Label>
              <Input
                id="googleRefreshToken"
                type="password"
                value={googleRefreshToken}
                onChange={(e) => setGoogleRefreshToken(e.target.value)}
                placeholder="From OAuth Playground"
                autoComplete="off"
              />
            </div>
            <Button
              type="submit"
              disabled={
                savingYoutube ||
                !googleClientId.trim() ||
                !googleClientSecret.trim() ||
                !googleRefreshToken.trim()
              }
            >
              {savingYoutube && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {savingYoutube ? "Connecting…" : "Connect account"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your accounts</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {connections === undefined && (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}
          {connections?.length === 0 && (
            <p className="text-sm text-muted-foreground">No accounts connected yet.</p>
          )}
          {connections?.map((conn) => (
            <div
              key={conn._id}
              className="flex items-center justify-between gap-4 rounded-lg border p-3"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{conn.platform}</span>
                  <Badge variant={statusVariant(conn.status)}>{conn.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {conn.platform === "X" ? "@" : ""}{conn.accountHandle}
                  {conn.lastTestedAt
                    ? ` · tested ${new Date(conn.lastTestedAt).toLocaleString()}`
                    : " · never tested"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={testingId === conn._id}
                  onClick={() => handleTest(conn._id, conn.platform)}
                >
                  {testingId === conn._id ? "Testing…" : "Test"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(conn._id)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
