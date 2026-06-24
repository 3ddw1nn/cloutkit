import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default function SignInPage() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center gap-4 px-6">
      <AuthForm flow="signIn" />
      <p className="text-sm text-muted-foreground">
        No account?{" "}
        <Link href="/signup" className="underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
