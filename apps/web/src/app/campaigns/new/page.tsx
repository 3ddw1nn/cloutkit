import { requireOnboardedUser } from "@/lib/auth-guards";
import { NewCampaignForm } from "./new-campaign-form";

export default async function NewCampaignPage() {
  await requireOnboardedUser();

  return (
    <div className="flex flex-1 justify-center px-6 py-12">
      <NewCampaignForm />
    </div>
  );
}
