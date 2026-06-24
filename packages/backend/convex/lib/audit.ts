import type { GenericMutationCtx, GenericDataModel } from "convex/server";
import type { Id } from "../_generated/dataModel";

export async function logAudit(
  ctx: GenericMutationCtx<GenericDataModel>,
  args: {
    workspaceId: Id<"workspaces">;
    userId: Id<"users">;
    action: string;
    entityType?: string;
    entityId?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadataJson?: any;
  },
) {
  await ctx.db.insert("auditLogs", args);
}
