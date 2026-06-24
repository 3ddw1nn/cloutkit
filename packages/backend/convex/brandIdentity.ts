import { query } from "./_generated/server";
import { getWorkspaceIdForCurrentUser } from "./workspaces";

export const getBrandIdentity = query({
  args: {},
  handler: async (ctx) => {
    const ids = await getWorkspaceIdForCurrentUser(ctx);
    if (ids === null) return null;

    return await ctx.db
      .query("brandIdentities")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", ids.workspaceId))
      .unique();
  },
});
