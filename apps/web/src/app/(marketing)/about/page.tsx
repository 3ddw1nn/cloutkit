export default function AboutPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">About CloutKit</h1>

      <p className="text-muted-foreground">
        CloutKit helps you turn a single campaign idea into a full,
        platform-specific sequence of social posts — drafted by AI, but
        always reviewed and approved by you before anything goes out.
      </p>

      <p className="text-muted-foreground">
        Every AI generation runs on your own OpenAI API key, so CloutKit
        itself is free to use for a limited time — you only ever pay OpenAI
        directly for what you generate. Once you&apos;re ready to publish, connect
        your X, Facebook, Instagram, or YouTube account and approved posts go
        out for real, with scheduling and analytics built in to track how
        they actually perform.
      </p>

      <p className="text-muted-foreground">
        It&apos;s built for people running their own brand or business on social
        media who want the speed of AI-generated content without giving up
        control over what actually gets posted.
      </p>
    </div>
  );
}
