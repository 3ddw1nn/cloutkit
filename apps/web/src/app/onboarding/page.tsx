import {
  convexAuthNextjsToken,
  isAuthenticatedNextjs,
} from "@convex-dev/auth/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { redirect } from "next/navigation";
import { api } from "@cloutkit/backend/convex/_generated/api";
import { OnboardingWizard } from "./onboarding-wizard";

export default async function OnboardingPage() {
  if (!(await isAuthenticatedNextjs())) {
    redirect("/signin");
  }

  const user = await fetchQuery(api.users.getCurrentUser, {}, {
    token: await convexAuthNextjsToken(),
  });
  if (user?.onboardingCompleted) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-12">
      <OnboardingWizard />
    </div>
  );
}
