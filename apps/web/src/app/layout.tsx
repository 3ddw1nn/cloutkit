import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { ConvexClientProvider } from "@/components/convex-client-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CloutKit",
  description: "AI-powered social media campaign sequences",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html
        lang="en"
        className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}
        suppressHydrationWarning
      >
        <body className="min-h-full flex flex-col">
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <ConvexClientProvider>{children}</ConvexClientProvider>
            <ThemeToggle />
            <Toaster />
          </ThemeProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
