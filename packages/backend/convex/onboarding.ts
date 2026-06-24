import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getWorkspaceIdForCurrentUser } from "./workspaces";

const TARGET_PLATFORMS = ["INSTAGRAM", "FACEBOOK", "X", "YOUTUBE"] as const;

export const getOnboardingProgress = query({
  args: {},
  handler: async (ctx) => {
    const ids = await getWorkspaceIdForCurrentUser(ctx);
    if (ids === null) return null;

    const existing = await ctx.db
      .query("onboardingResponses")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", ids.workspaceId))
      .unique();

    if (existing !== null) return existing;

    return {
      _id: null,
      currentStep: 1,
      completed: false,
      responsesJson: {} as Record<string, any>,
    };
  },
});

export const saveOnboardingStep = mutation({
  args: {
    step: v.number(),
    answers: v.record(v.string(), v.any()),
  },
  handler: async (ctx, { step, answers }) => {
    const ids = await getWorkspaceIdForCurrentUser(ctx);
    if (ids === null) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("onboardingResponses")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", ids.workspaceId))
      .unique();

    if (existing === null) {
      await ctx.db.insert("onboardingResponses", {
        workspaceId: ids.workspaceId,
        userId: ids.userId,
        currentStep: step + 1,
        completed: false,
        responsesJson: { [`step${step}`]: answers },
      });
      return;
    }

    await ctx.db.patch("onboardingResponses", existing._id, {
      currentStep: Math.max(existing.currentStep, step + 1),
      responsesJson: { ...existing.responsesJson, [`step${step}`]: answers },
    });
  },
});

export const completeOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    const ids = await getWorkspaceIdForCurrentUser(ctx);
    if (ids === null) throw new Error("Not authenticated");

    const progress = await ctx.db
      .query("onboardingResponses")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", ids.workspaceId))
      .unique();
    if (progress === null) throw new Error("No onboarding progress to complete");

    const r = progress.responsesJson;
    const step1 = r.step1 ?? {};
    const step2 = r.step2 ?? {};
    const step3 = r.step3 ?? {};
    const step4 = r.step4 ?? {};
    const step5 = r.step5 ?? {};
    const step6 = r.step6 ?? {};
    const step7 = r.step7 ?? {};

    const longDescription = [step2.knownFor, step2.mission, step2.differentiation]
      .filter((part): part is string => Boolean(part))
      .join(" ");

    const brandIdentityFields = {
      workspaceId: ids.workspaceId,
      brandName: step1.brandName ?? "",
      brandType: step1.brandType ?? "OTHER",
      websiteUrl: step1.websiteUrl,
      shortBio: step1.shortBio ?? "",
      industry: step1.industry,
      longDescription: longDescription || undefined,
      mission: step2.mission,
      differentiation: step2.differentiation,
      productsServices: step2.productsServices,
      goals: step2.goals,
      targetAudience: step3.targetAudience,
      audienceProblems: step3.audienceProblems,
      audienceInterests: step3.audienceInterests,
      audienceKnowledgeLevel: step3.audienceKnowledgeLevel,
      audienceLocation: step3.audienceLocation,
      tone: step4.tone,
      writingStyle: step4.writingStyle,
      emojiPreference: step4.emojiPreference,
      humorLevel: step4.humorLevel,
      formalityLevel: step4.formalityLevel,
      technicalDepth: step4.technicalDepth,
      personalVsCompanyVoice: step4.personalVsCompanyVoice,
      contentTypes: step5.contentTypes,
      topics: step5.topics,
      avoidedTopics: step5.avoidedTopics,
      examplePosts: step5.examplePosts,
      wordsToUse: step5.wordsToUse,
      wordsToAvoid: step5.wordsToAvoid,
      ctaPreferences: step5.ctaPreferences,
    };

    const existingBrandIdentity = await ctx.db
      .query("brandIdentities")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", ids.workspaceId))
      .unique();
    if (existingBrandIdentity !== null) {
      await ctx.db.patch("brandIdentities", existingBrandIdentity._id, brandIdentityFields);
    } else {
      await ctx.db.insert("brandIdentities", brandIdentityFields);
    }

    const existingPlatformGoals = await ctx.db
      .query("platformGoals")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", ids.workspaceId))
      .collect();
    const platforms = step6.platforms ?? {};
    for (const platform of TARGET_PLATFORMS) {
      const data = platforms[platform];
      if (!data) continue;
      const existing = existingPlatformGoals.find((p) => p.platform === platform);
      const fields = {
        workspaceId: ids.workspaceId,
        platform,
        enabled: Boolean(data.enabled),
        goal: data.goal,
        contentTypes: data.contentTypes,
        postingFrequency: data.postingFrequency,
        stylePreference: data.stylePreference,
      };
      if (existing) {
        await ctx.db.patch("platformGoals", existing._id, fields);
      } else {
        await ctx.db.insert("platformGoals", fields);
      }
    }

    await ctx.db.patch("workspaces", ids.workspaceId, {
      requireApprovalBeforePublishing: step7.requireApprovalBeforePublishing ?? true,
      requireApprovalBeforeComments: step7.requireApprovalBeforeComments ?? true,
      requireApprovalBeforeFollows: step7.requireApprovalBeforeFollows ?? true,
      requireApprovalBeforeLikes: step7.requireApprovalBeforeLikes ?? true,
      requireApprovalBeforeReposts: step7.requireApprovalBeforeReposts ?? true,
      allowSchedulingAfterApproval: step7.allowSchedulingAfterApproval ?? true,
      allowAutoPublishScheduledApprovedPosts:
        step7.allowAutoPublishScheduledApprovedPosts ?? false,
    });

    await ctx.db.patch("onboardingResponses", progress._id, { completed: true });
    await ctx.db.patch("users", ids.userId, { onboardingCompleted: true });
  },
});
