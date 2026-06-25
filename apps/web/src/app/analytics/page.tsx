import { isAuthenticatedNextjs } from "@convex-dev/auth/nextjs/server";
import { redirect } from "next/navigation";
import { AnalyticsContent } from "./analytics-content";

export default async function AnalyticsPage() {
  if (!(await isAuthenticatedNextjs())) {
    redirect("/signin");
  }

  return (
    <div className="flex flex-1 justify-center px-6 py-12">
      <AnalyticsContent />
    </div>
  );
}
