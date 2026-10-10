"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { setTheme } = useTheme();

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="dark:hidden cursor-pointer disabled:cursor-not-allowed"
        onClick={() => setTheme("dark")}
        aria-label="Switch to dark theme"
      >
        <Moon className="size-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="hidden dark:inline-flex cursor-pointer disabled:cursor-not-allowed"
        onClick={() => setTheme("light")}
        aria-label="Switch to light theme"
      >
        <Sun className="size-4" />
      </Button>
    </>
  );
}