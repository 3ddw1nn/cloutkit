import { requireOnboardedUser } from "@/lib/auth-guards";
import { DashboardContent } from "./dashboard-content";

export default async function DashboardPage() {
  await requireOnboardedUser();

  return <DashboardContent />;
}
