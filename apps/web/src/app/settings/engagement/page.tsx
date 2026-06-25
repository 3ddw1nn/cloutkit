import { isAuthenticatedNextjs } from "@convex-dev/auth/nextjs/server";
import { redirect } from "next/navigation";
import { EngagementRoutineContent } from "./engagement-routine-content";

export default async function EngagementSettingsPage() {
  if (!(await isAuthenticatedNextjs())) {
    redirect("/signin");
  }

  return (
    <div className="flex flex-1 justify-center px-6 py-12">
      <EngagementRoutineContent />
    </div>
  );
}
