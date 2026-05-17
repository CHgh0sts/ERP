"use client";

import * as React from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme, type Theme } from "./theme-provider";

const ORDER: Theme[] = ["system", "light", "dark"];

function iconFor(t: Theme) {
  if (t === "light") return Sun;
  if (t === "dark") return Moon;
  return Monitor;
}

function labelFor(t: Theme) {
  if (t === "light") return "Clair";
  if (t === "dark") return "Sombre";
  return "Systeme";
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const Icon = iconFor(theme);

  function cycle() {
    const idx = ORDER.indexOf(theme);
    const next = ORDER[(idx + 1) % ORDER.length];
    setTheme(next);
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={cycle}
      className={cn("gap-1.5", className)}
      title={`Theme : ${labelFor(theme)} (cliquer pour changer)`}
      aria-label={`Changer le theme (actuel : ${labelFor(theme)})`}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{labelFor(theme)}</span>
    </Button>
  );
}

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="grid grid-cols-3 gap-2">
      {ORDER.map((t) => {
        const Icon = iconFor(t);
        const active = theme === t;
        return (
          <button
            key={t}
            type="button"
            onClick={() => setTheme(t)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors",
              "hover:border-primary/50 hover:bg-accent/50",
              active
                ? "border-primary bg-accent text-accent-foreground"
                : "border-border bg-card",
            )}
          >
            <Icon className={cn("h-6 w-6", active && "text-primary")} />
            <span className="text-sm font-medium">{labelFor(t)}</span>
            <span className="text-xs text-muted-foreground text-center">
              {t === "system" && "Suit le systeme"}
              {t === "light" && "Mode clair"}
              {t === "dark" && "Mode sombre"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
