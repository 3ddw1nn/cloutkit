import { createOpenAI } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { z } from "zod";
import type { Doc } from "../_generated/dataModel";

// Rough per-1M-token pricing in USD, just enough to populate
// apiUsageLogs.estimatedCost — not pulled from a live pricing API.
const PRICING_PER_MILLION_TOKENS: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4.1": { input: 2, output: 8 },
};

export const campaignIdeaSchema = z.object({
  mainAngle: z.string(),
  targetAudience: z.string(),
  tone: z.string(),
  keyMessage: z.string(),
  // An array, not a record/dictionary: OpenAI's structured-output mode
  // rejects JSON Schema's `propertyNames` keyword, which z.record() emits.
  platformStrategy: z.array(z.object({ platform: z.string(), strategy: z.string() })),
  contentDirection: z.string(),
  engagementStrategy: z.string(),
  recommendedSequence: z.array(
    z.object({ platform: z.string(), contentType: z.string(), order: z.number() }),
  ),
});

export type CampaignIdeaOutput = z.infer<typeof campaignIdeaSchema>;

function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING_PER_MILLION_TOKENS[model];
  if (!pricing) return 0;
  return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
}

export async function generateCampaignIdea(params: {
  apiKey: string;
  model: string;
  brandIdentity: Doc<"brandIdentities"> | null;
  campaign: Doc<"campaigns">;
  platformGoals: Doc<"platformGoals">[];
}): Promise<{
  data: CampaignIdeaOutput;
  rawAiOutput: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  estimatedCost: number;
}> {
  const { apiKey, model, brandIdentity, campaign, platformGoals } = params;
  const provider = createOpenAI({ apiKey });

  const systemPrompt = [
    "You are a social media campaign strategist.",
    brandIdentity?.shortBio ? `Brand: ${brandIdentity.brandName} — ${brandIdentity.shortBio}` : null,
    brandIdentity?.mission ? `Mission: ${brandIdentity.mission}` : null,
    brandIdentity?.targetAudience ? `Audience: ${brandIdentity.targetAudience}` : null,
    brandIdentity?.tone?.length ? `Tone: ${brandIdentity.tone.join(", ")}` : null,
    brandIdentity?.writingStyle ? `Writing style: ${brandIdentity.writingStyle}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const platformLines = platformGoals
    .filter((p) => p.enabled)
    .map((p) => `- ${p.platform}: goal=${p.goal ?? "n/a"}`)
    .join("\n");

  const userPrompt = [
    `Campaign topic: ${campaign.inputTopic}`,
    campaign.objective ? `Objective: ${campaign.objective}` : null,
    `Campaign type: ${campaign.campaignType}`,
    platformLines ? `Enabled platforms:\n${platformLines}` : null,
    "Generate a lightweight campaign idea (not full posts yet) covering the main angle, target audience, tone, key message, a one-line strategy per platform, content direction, engagement strategy, and a recommended sequence outline (platform + content type + order).",
  ]
    .filter(Boolean)
    .join("\n\n");

  const result = await generateText({
    model: provider(model),
    system: systemPrompt,
    prompt: userPrompt,
    output: Output.object({ schema: campaignIdeaSchema }),
  });

  const promptTokens = result.usage.inputTokens ?? 0;
  const completionTokens = result.usage.outputTokens ?? 0;

  return {
    data: result.output,
    rawAiOutput: JSON.stringify(result.output),
    usage: {
      promptTokens,
      completionTokens,
      totalTokens: result.usage.totalTokens ?? promptTokens + completionTokens,
    },
    estimatedCost: estimateCost(model, promptTokens, completionTokens),
  };
}
