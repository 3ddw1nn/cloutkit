import { requireOnboardedUser } from "@/lib/auth-guards";
import { EngagementReview } from "./engagement-review";
import type { Id } from "@cloutkit/backend/convex/_generated/dataModel";

export default async function EngagementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireOnboardedUser();
  const { id } = await params;

  return (
    <div className="flex flex-1 justify-center px-6 py-12">
      <EngagementReview campaignId={id as Id<"campaigns">} />
    </div>
  );
}
