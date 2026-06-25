/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as apiKeyActions from "../apiKeyActions.js";
import type * as apiKeys from "../apiKeys.js";
import type * as auth from "../auth.js";
import type * as brandIdentity from "../brandIdentity.js";
import type * as campaignActions from "../campaignActions.js";
import type * as campaigns from "../campaigns.js";
import type * as engagement from "../engagement.js";
import type * as engagementActions from "../engagementActions.js";
import type * as http from "../http.js";
import type * as lib_ai from "../lib/ai.js";
import type * as lib_audit from "../lib/audit.js";
import type * as lib_encryption from "../lib/encryption.js";
import type * as lib_validators from "../lib/validators.js";
import type * as lib_xOAuth1 from "../lib/xOAuth1.js";
import type * as onboarding from "../onboarding.js";
import type * as platformGoals from "../platformGoals.js";
import type * as postActions from "../postActions.js";
import type * as postPublishActions from "../postPublishActions.js";
import type * as posts from "../posts.js";
import type * as socialConnectionActions from "../socialConnectionActions.js";
import type * as socialConnections from "../socialConnections.js";
import type * as users from "../users.js";
import type * as workspaces from "../workspaces.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  apiKeyActions: typeof apiKeyActions;
  apiKeys: typeof apiKeys;
  auth: typeof auth;
  brandIdentity: typeof brandIdentity;
  campaignActions: typeof campaignActions;
  campaigns: typeof campaigns;
  engagement: typeof engagement;
  engagementActions: typeof engagementActions;
  http: typeof http;
  "lib/ai": typeof lib_ai;
  "lib/audit": typeof lib_audit;
  "lib/encryption": typeof lib_encryption;
  "lib/validators": typeof lib_validators;
  "lib/xOAuth1": typeof lib_xOAuth1;
  onboarding: typeof onboarding;
  platformGoals: typeof platformGoals;
  postActions: typeof postActions;
  postPublishActions: typeof postPublishActions;
  posts: typeof posts;
  socialConnectionActions: typeof socialConnectionActions;
  socialConnections: typeof socialConnections;
  users: typeof users;
  workspaces: typeof workspaces;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
