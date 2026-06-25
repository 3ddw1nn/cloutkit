"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

// The resolved theme is only known after next-themes reads localStorage on
// the client, so the icon must stay neutral until then — rendering it from
// `resolvedTheme` directly causes a server/client hydration mismatch.
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- documented next-themes hydration pattern, not a render loop
    setMounted(true);
  }, []);

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="fixed top-1/2 right-4 z-50 -translate-y-1/2 rounded-full shadow-sm"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      {mounted && resolvedTheme === "dark" ? (
        <Sun className="size-4" />
      ) : (
        <Moon className="size-4" />
      )}
    </Button>
  );
}
