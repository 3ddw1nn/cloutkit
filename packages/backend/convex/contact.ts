import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const submitContactMessage = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    message: v.string(),
  },
  handler: async (ctx, { name, email, message }) => {
    await ctx.db.insert("contactMessages", {
      name,
      email,
      message,
      submittedAt: Date.now(),
    });
  },
});
