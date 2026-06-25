import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FEATURES = [
  {
    title: "AI campaign sequences",
    description:
      "Describe a campaign and get a full, platform-specific sequence of posts drafted for you — reviewed and approved step by step, never auto-published.",
  },
  {
    title: "Real publishing",
    description:
      "Connect X, Facebook, Instagram, and YouTube and approved posts go out for real — no mock URLs once you're connected.",
  },
  {
    title: "Scheduling",
    description:
      "Publish now or schedule a campaign for later. Cancel anytime before it goes out.",
  },
  {
    title: "Analytics",
    description:
      "See real likes, comments, shares, and views pulled straight from each platform once your posts are live.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col items-center gap-6 px-6 py-24 text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">CloutKit</h1>
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

      <div className="mx-auto grid w-full max-w-5xl gap-4 px-6 pb-24 sm:grid-cols-2">
        {FEATURES.map((feature) => (
          <Card key={feature.title}>
            <CardHeader>
              <CardTitle className="text-base">{feature.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {feature.description}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
