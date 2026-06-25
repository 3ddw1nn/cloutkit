import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center gap-6 text-center px-6">
      <h1 className="text-4xl font-semibold tracking-tight">CloutKit</h1>
      <p className="max-w-md text-muted-foreground">
        AI-generated social media campaign sequences, reviewed and approved
        step by step.
      </p>
      <p className="max-w-md text-sm text-muted-foreground">
        Free for a limited time — bring your own OpenAI API key and you only
        ever pay OpenAI directly for what you generate.
      </p>
      <div className="flex gap-3">
        <Link href="/signup" className={buttonVariants()}>
          Sign up
        </Link>
        <Link href="/signin" className={buttonVariants({ variant: "outline" })}>
          Sign in
        </Link>
      </div>
    </div>
  );
}
