import { requireOnboardedUser } from "@/lib/auth-guards";
import { CampaignsContent } from "./campaigns-content";

export default async function CampaignsPage() {
  await requireOnboardedUser();

  return (
    <div className="flex flex-1 justify-center px-6 py-12">
      <CampaignsContent />
    </div>
  );
}
