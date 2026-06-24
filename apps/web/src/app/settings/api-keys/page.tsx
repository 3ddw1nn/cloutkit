import { isAuthenticatedNextjs } from "@convex-dev/auth/nextjs/server";
import { redirect } from "next/navigation";
import { ApiKeysContent } from "./api-keys-content";

export default async function ApiKeysSettingsPage() {
  if (!(await isAuthenticatedNextjs())) {
    redirect("/signin");
  }

  return (
    <div className="flex flex-1 justify-center px-6 py-12">
      <ApiKeysContent />
    </div>
  );
}
