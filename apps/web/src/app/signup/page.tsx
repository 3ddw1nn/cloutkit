import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default function SignUpPage() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center gap-4 px-6">
      <AuthForm flow="signUp" />
      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/signin" className="underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
