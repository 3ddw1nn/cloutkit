import { isAuthenticatedNextjs } from "@convex-dev/auth/nextjs/server";
import { redirect } from "next/navigation";
import { DashboardContent } from "./dashboard-content";

export default async function DashboardPage() {
  if (!(await isAuthenticatedNextjs())) {
    redirect("/signin");
  }

  return <DashboardContent />;
}
