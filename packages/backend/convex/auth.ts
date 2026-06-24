import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
  callbacks: {
    async afterUserCreatedOrUpdated(ctx, { userId, existingUserId }) {
      if (existingUserId !== null) return;

      const workspaceId = await ctx.db.insert("workspaces", {
        name: "My Workspace",
        ownerId: userId,
      });
      await ctx.db.insert("workspaceMembers", {
        workspaceId,
        userId,
        role: "OWNER",
      });
    },
  },
});
