import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";

export const getCurrentWorkspace = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;

    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (membership === null) return null;

    const workspace = await ctx.db.get("workspaces", membership.workspaceId);
    if (workspace === null) return null;

    return { ...workspace, role: membership.role };
  },
});
