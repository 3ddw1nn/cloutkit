import { ContactForm } from "./contact-form";

export default function ContactPage() {
  return (
    <div className="mx-auto flex max-w-md flex-1 flex-col gap-6 px-6 py-16">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Contact us</h1>
        <p className="mt-2 text-muted-foreground">
          Questions, feedback, or something broken? Send us a message.
        </p>
      </div>
      <ContactForm />
    </div>
  );
}
