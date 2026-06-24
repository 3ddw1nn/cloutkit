import { getAuthUserId } from "@convex-dev/auth/server";
import { internalQuery, query, QueryCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export async function getWorkspaceIdForCurrentUser(
  ctx: QueryCtx | MutationCtx,
): Promise<{ userId: Id<"users">; workspaceId: Id<"workspaces"> } | null> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) return null;

  const membership = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
  if (membership === null) return null;

  return { userId, workspaceId: membership.workspaceId };
}

// Lets actions (which have no `ctx.db`) resolve the current user's
// workspace via `ctx.runQuery`.
export const getMyWorkspaceId = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await getWorkspaceIdForCurrentUser(ctx);
  },
});

export const getCurrentWorkspace = query({
  args: {},
  handler: async (ctx) => {
    const ids = await getWorkspaceIdForCurrentUser(ctx);
    if (ids === null) return null;

    const workspace = await ctx.db.get("workspaces", ids.workspaceId);
    if (workspace === null) return null;

    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspaceId_and_userId", (q) =>
        q.eq("workspaceId", ids.workspaceId).eq("userId", ids.userId),
      )
      .unique();

    return { ...workspace, role: membership?.role };
  },
});
