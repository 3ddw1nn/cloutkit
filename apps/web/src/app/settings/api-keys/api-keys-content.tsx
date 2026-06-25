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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const OPENAI_MODELS = ["gpt-4o-mini", "gpt-4o", "gpt-4.1"];

function statusVariant(status: string): "default" | "destructive" | "secondary" {
  if (status === "ACTIVE") return "default";
  if (status === "INVALID") return "destructive";
  return "secondary";
}

export function ApiKeysContent() {
  const apiKeys = useQuery(api.apiKeys.listApiKeys);
  const providerSetting = useQuery(api.apiKeys.getAiProviderSetting);
  const createApiKey = useAction(api.apiKeyActions.createApiKey);
  const testApiKey = useAction(api.apiKeyActions.testApiKey);
  const deleteApiKey = useMutation(api.apiKeys.deleteApiKey);
  const setActiveProvider = useMutation(api.apiKeys.setActiveProvider);

  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<Id<"userApiKeys"> | null>(null);

  async function handleAddKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!apiKey.trim()) return;

    setSaving(true);
    try {
      await createApiKey({ provider: "OPENAI", apiKey });
      setApiKey("");
      toast.success("API key saved");
    } catch {
      toast.error("Could not save key");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest(id: Id<"userApiKeys">) {
    setTestingId(id);
    try {
      const result = await testApiKey({ apiKeyId: id });
      toast[result.success ? "success" : "error"](
        result.success ? "Key is valid" : "Key failed validation",
      );
    } catch {
      toast.error("Could not test key");
    } finally {
      setTestingId(null);
    }
  }

  async function handleDelete(id: Id<"userApiKeys">) {
    await deleteApiKey({ id });
    toast.success("Key removed");
  }

  return (
    <div className="flex w-full max-w-xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">API keys</h1>
        <p className="text-muted-foreground">
          Bring your own AI provider key. We encrypt it at rest and only ever decrypt it
          server-side. CloutKit itself is free for a limited time — you pay the provider
          directly for what you generate, nothing goes through us.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add a key</CardTitle>
          <CardDescription>OpenAI only for now — more providers later.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleAddKey}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="provider">Provider</Label>
              <Select value="OPENAI" disabled>
                <SelectTrigger id="provider" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPENAI">OpenAI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="apiKey">API key</Label>
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                autoComplete="off"
              />
            </div>
            <Button type="submit" disabled={saving || !apiKey.trim()}>
              {saving ? "Saving…" : "Save key"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your keys</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {apiKeys === undefined && (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}
          {apiKeys?.length === 0 && (
            <p className="text-sm text-muted-foreground">No keys added yet.</p>
          )}
          {apiKeys?.map((key) => (
            <div
              key={key._id}
              className="flex items-center justify-between gap-4 rounded-lg border p-3"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{key.provider}</span>
                  <Badge variant={statusVariant(key.status)}>{key.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {key.keyPreview}
                  {key.lastTestedAt
                    ? ` · tested ${new Date(key.lastTestedAt).toLocaleString()}`
                    : " · never tested"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={testingId === key._id}
                  onClick={() => handleTest(key._id)}
                >
                  {testingId === key._id ? "Testing…" : "Test"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(key._id)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active provider</CardTitle>
          <CardDescription>Used for campaign generation once that&apos;s built.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Label htmlFor="model">Model</Label>
          <Select
            value={providerSetting?.model ?? OPENAI_MODELS[0]}
            onValueChange={(model) =>
              model !== null && setActiveProvider({ provider: "OPENAI", model })
            }
          >
            <SelectTrigger id="model" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPENAI_MODELS.map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    </div>
  );
}
