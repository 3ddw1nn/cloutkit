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

export const PEAK_TIMES: Record<string, { weekday: string[]; weekend: string[] }> = {
  INSTAGRAM: { weekday: ["9:00", "13:00", "18:00"], weekend: ["10:00", "14:00", "19:00"] },
  FACEBOOK: { weekday: ["8:00", "12:00", "19:00"], weekend: ["11:00", "15:00", "20:00"] },
  X: { weekday: ["7:00", "12:00", "17:00"], weekend: ["9:00", "13:00", "18:00"] },
  YOUTUBE: { weekday: ["18:00", "20:00", "22:00"], weekend: ["19:00", "21:00", "23:00"] },
};

export const ALLOWED_ACTIONS_BY_PLATFORM: Record<string, string[]> = {
  INSTAGRAM: ["COMMENT", "LIKE", "FOLLOW"],
  FACEBOOK: ["COMMENT", "LIKE", "REACT", "FOLLOW"],
  X: ["REPLY", "LIKE", "REPOST", "FOLLOW"],
  YOUTUBE: ["COMMENT", "LIKE", "SUBSCRIBE"],
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

export async function generateFullSequence(params: {
  apiKey: string;
  model: string;
  brandIdentity: Doc<"brandIdentities"> | null;
  campaign: Doc<"campaigns">;
  idea: Doc<"campaignIdeas">;
}): Promise<{
  posts: Array<{ content: string; mediaDescription: string }>;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  estimatedCost: number;
}> {
  const { apiKey, model, brandIdentity, campaign, idea } = params;
  const provider = createOpenAI({ apiKey });

  const sequenceSlots = (idea.recommendedSequenceJson as Array<{
    platform: string;
    contentType: string;
    order: number;
  }>) || [];

  const systemPrompt = [
    "You are a social media content strategist.",
    `Brand: ${brandIdentity?.brandName ?? "Unknown"}`,
    brandIdentity?.shortBio ? `Bio: ${brandIdentity.shortBio}` : null,
    `Campaign angle: ${idea.mainAngle}`,
    `Key message: ${idea.keyMessage}`,
    `Tone: ${idea.tone}`,
  ]
    .filter(Boolean)
    .join("\n");

  const slotsDescription = sequenceSlots
    .map((s, i) => `Slot ${i + 1}: ${s.platform} (${s.contentType})`)
    .join("\n");

  const userPrompt = `Write real, engaging post content for these platforms:\n${slotsDescription}\n\nReturn a JSON array with one object per slot, each with "content" and "mediaDescription" fields. Keep it concise and platform-native.`;

  const postSchema = z.object({
    content: z.string(),
    mediaDescription: z.string(),
  });

  const result = await generateText({
    model: provider(model),
    system: systemPrompt,
    prompt: userPrompt,
    output: Output.object({ schema: z.array(postSchema) }),
  });

  const promptTokens = result.usage.inputTokens ?? 0;
  const completionTokens = result.usage.outputTokens ?? 0;

  return {
    posts: result.output,
    usage: {
      promptTokens,
      completionTokens,
      totalTokens: result.usage.totalTokens ?? promptTokens + completionTokens,
    },
    estimatedCost: estimateCost(model, promptTokens, completionTokens),
  };
}

export async function regeneratePost(params: {
  apiKey: string;
  model: string;
  brandIdentity: Doc<"brandIdentities"> | null;
  campaign: Doc<"campaigns">;
  post: Doc<"posts">;
  idea: Doc<"campaignIdeas">;
}): Promise<{
  content: string;
  mediaDescription: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  estimatedCost: number;
}> {
  const { apiKey, model, brandIdentity, campaign, post, idea } = params;
  const provider = createOpenAI({ apiKey });

  const systemPrompt = [
    "You are a social media content strategist.",
    `Brand: ${brandIdentity?.brandName ?? "Unknown"}`,
    brandIdentity?.shortBio ? `Bio: ${brandIdentity.shortBio}` : null,
    `Campaign angle: ${idea.mainAngle}`,
    `Key message: ${idea.keyMessage}`,
    `Tone: ${idea.tone}`,
  ]
    .filter(Boolean)
    .join("\n");

  const userPrompt = `Rewrite this post in a different way:\nPlatform: ${post.platform}\nType: ${post.contentType}\nExisting post: "${post.content}"\n\nReturn a JSON object with "content" and "mediaDescription" fields.`;

  const postSchema = z.object({
    content: z.string(),
    mediaDescription: z.string(),
  });

  const result = await generateText({
    model: provider(model),
    system: systemPrompt,
    prompt: userPrompt,
    output: Output.object({ schema: postSchema }),
  });

  const promptTokens = result.usage.inputTokens ?? 0;
  const completionTokens = result.usage.outputTokens ?? 0;

  return {
    content: result.output.content,
    mediaDescription: result.output.mediaDescription,
    usage: {
      promptTokens,
      completionTokens,
      totalTokens: result.usage.totalTokens ?? promptTokens + completionTokens,
    },
    estimatedCost: estimateCost(model, promptTokens, completionTokens),
  };
}

const engagementOpportunitySchema = z.object({
  platform: z.string(),
  actionType: z.string(),
  targetType: z.string(),
  targetHandle: z.string(),
  targetFollowerCount: z.number().optional(),
  targetPostSnippet: z.string().optional(),
  proposedText: z.string().optional(),
  scheduledTime: z.string(),
});

export async function generateEngagementWave(params: {
  apiKey: string;
  model: string;
  brandIdentity: Doc<"brandIdentities"> | null;
  campaign: Doc<"campaigns">;
  idea: Doc<"campaignIdeas">;
  dayDate: string;
  dayType: "WEEKDAY" | "WEEKEND";
}): Promise<{
  opportunities: Array<z.infer<typeof engagementOpportunitySchema>>;
  rawAiOutput: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  estimatedCost: number;
}> {
  const { apiKey, model, brandIdentity, campaign, idea, dayDate, dayType } = params;
  const provider = createOpenAI({ apiKey });

  const platformLines = campaign.selectedPlatforms
    .map((platform) => {
      const peakTimes = PEAK_TIMES[platform]?.[dayType.toLowerCase() as "weekday" | "weekend"] || [
        "10:00",
        "14:00",
        "18:00",
      ];
      const allowedActions = ALLOWED_ACTIONS_BY_PLATFORM[platform] || ["COMMENT", "LIKE"];
      return `- ${platform}: peak times ${peakTimes.join(", ")}, allowed actions: ${allowedActions.join(", ")}`;
    })
    .join("\n");

  const systemPrompt = [
    "You are a social media growth strategist generating outbound engagement opportunities.",
    `Brand: ${brandIdentity?.brandName ?? "Unknown"}`,
    brandIdentity?.shortBio ? `Bio: ${brandIdentity.shortBio}` : null,
    `Campaign angle: ${idea.mainAngle}`,
    `Key message: ${idea.keyMessage}`,
    `Tone: ${idea.tone}`,
    `\nIMPORTANT: The targets you suggest are ILLUSTRATIVE PLACEHOLDERS (no live social search yet). Draft them in the brand voice and style, but do not claim they are real current accounts.`,
  ]
    .filter(Boolean)
    .join("\n");

  const userPrompt = [
    `Generate ${dayType === "WEEKEND" ? "weekend" : "weekday"} outbound engagement opportunities for ${dayDate}.`,
    `\nPlatforms and their peak times:\n${platformLines}`,
    `\nFor each opportunity, include:`,
    `- A realistic-looking handle (start with @)`,
    `- Target type (POST or ACCOUNT)`,
    `- Follower count if ACCOUNT (1k-500k)`,
    `- If POST: a 1-line snippet of what they might be posting about`,
    `- The action to take (respecting platform constraints)`,
    `- If actionType is COMMENT/REPLY, a proposed text (1-2 sentences, authentic and on-brand)`,
    `- Scheduled time in HH:MM format (pick from the peak times listed)`,
    `\nReturn a JSON array of objects with fields: platform, actionType, targetType, targetHandle, targetFollowerCount?, targetPostSnippet?, proposedText?, scheduledTime.`,
    `Generate 5-8 opportunities distributed across the enabled platforms.`,
  ].join("\n");

  const result = await generateText({
    model: provider(model),
    system: systemPrompt,
    prompt: userPrompt,
    output: Output.object({ schema: z.array(engagementOpportunitySchema) }),
  });

  const promptTokens = result.usage.inputTokens ?? 0;
  const completionTokens = result.usage.outputTokens ?? 0;

  return {
    opportunities: result.output,
    rawAiOutput: JSON.stringify(result.output),
    usage: {
      promptTokens,
      completionTokens,
      totalTokens: result.usage.totalTokens ?? promptTokens + completionTokens,
    },
    estimatedCost: estimateCost(model, promptTokens, completionTokens),
  };
}

export async function generateRoutineEngagementQueue(params: {
  apiKey: string;
  model: string;
  brandIdentity: Doc<"brandIdentities"> | null;
  platformGoals: Doc<"platformGoals">[];
  targets: { comments: number; likes: number; follows: number; replies: number };
}): Promise<{
  opportunities: Array<z.infer<typeof engagementOpportunitySchema>>;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  estimatedCost: number;
}> {
  const { apiKey, model, brandIdentity, platformGoals, targets } = params;
  const provider = createOpenAI({ apiKey });

  const enabledPlatforms = platformGoals.filter((p) => p.enabled).map((p) => p.platform);

  const systemPrompt = [
    "You are a social media growth strategist generating daily engagement routines.",
    `Brand: ${brandIdentity?.brandName ?? "Unknown"}`,
    brandIdentity?.shortBio ? `Bio: ${brandIdentity.shortBio}` : null,
    `\nIMPORTANT: The targets you suggest are ILLUSTRATIVE PLACEHOLDERS (no live social search yet). Draft them in the brand voice and style.`,
  ]
    .filter(Boolean)
    .join("\n");

  const userPrompt = [
    `Generate a daily engagement routine for today with:`,
    `- ${targets.comments} comments (pick platforms that support comments)`,
    `- ${targets.likes} likes (any platform)`,
    `- ${targets.follows} follows (pick platforms that support follows)`,
    `- ${targets.replies} replies (pick platforms that support replies)`,
    `\nEnabled platforms: ${enabledPlatforms.join(", ")}`,
    `\nFor each opportunity, include:`,
    `- A realistic-looking handle (start with @)`,
    `- Target type (POST or ACCOUNT)`,
    `- Follower count if ACCOUNT (1k-500k)`,
    `- If POST: a 1-line snippet of what they might be posting about`,
    `- The action to take`,
    `- If actionType is COMMENT/REPLY, a proposed text (1-2 sentences, authentic and on-brand)`,
    `- Scheduled time in HH:MM format (distribute throughout the day)`,
    `\nReturn a JSON array of objects with fields: platform, actionType, targetType, targetHandle, targetFollowerCount?, targetPostSnippet?, proposedText?, scheduledTime.`,
  ].join("\n");

  const result = await generateText({
    model: provider(model),
    system: systemPrompt,
    prompt: userPrompt,
    output: Output.object({ schema: z.array(engagementOpportunitySchema) }),
  });

  const promptTokens = result.usage.inputTokens ?? 0;
  const completionTokens = result.usage.outputTokens ?? 0;

  return {
    opportunities: result.output,
    usage: {
      promptTokens,
      completionTokens,
      totalTokens: result.usage.totalTokens ?? promptTokens + completionTokens,
    },
    estimatedCost: estimateCost(model, promptTokens, completionTokens),
  };
}
