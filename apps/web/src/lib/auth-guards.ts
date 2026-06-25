import {
  convexAuthNextjsToken,
  isAuthenticatedNextjs,
} from "@convex-dev/auth/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { redirect } from "next/navigation";
import { api } from "@cloutkit/backend/convex/_generated/api";

// Redirects to /signin or /onboarding as needed; otherwise returns.
// For use at the top of Server Component pages that require a fully
// onboarded user (mirrors the dashboard's original inline checks).
export async function requireOnboardedUser() {
  if (!(await isAuthenticatedNextjs())) {
    redirect("/signin");
  }

  const user = await fetchQuery(
    api.users.getCurrentUser,
    {},
    { token: await convexAuthNextjsToken() },
  );
  if (!user?.onboardingCompleted) {
    redirect("/onboarding");
  }
}
