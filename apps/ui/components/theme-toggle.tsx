"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import type { TranslationDict } from "@/app/i18n/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ThemeToggleProps = {
  dict: TranslationDict["global"];
};

/**
 * ThemeToggle component allows users to switch between
 * light, dark, and system themes. It uses next-themes
 * and provides localized labels via the `dict` prop.
 *
 * @param dict - The global section of the translation dictionary
 * @returns A dropdown button for theme selection
 *
 * @example
 * <ThemeToggle dict={dict.global} />
 */
export function ThemeToggle({ dict }: ThemeToggleProps) {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">{dict.themeToggle}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          {dict.light}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          {dict.dark}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          {dict.system}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
