import { query } from "./_generated/server";
import { getWorkspaceIdForCurrentUser } from "./workspaces";

export const getPlatformGoals = query({
  args: {},
  handler: async (ctx) => {
    const ids = await getWorkspaceIdForCurrentUser(ctx);
    if (ids === null) return [];

    return await ctx.db
      .query("platformGoals")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", ids.workspaceId))
      .collect();
  },
});
