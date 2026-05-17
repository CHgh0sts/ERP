"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import type { JwtPayload } from "@/lib/auth/jwt";
import { LogOut, UserCircle } from "lucide-react";

export function Topbar({ user }: { user: JwtPayload }) {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="h-14 bg-card border-b border-border flex items-center justify-between px-6 sticky top-0 z-10 shadow-card">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Bienvenue,</span>
        <span className="font-medium text-foreground">{user.name}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden md:flex gap-1.5">
          {user.roles.map((r) => (
            <Badge key={r} variant={r === "ADMIN" ? "default" : "secondary"}>
              {r}
            </Badge>
          ))}
        </div>
        <ThemeToggle />
        <Link href="/account" title="Mon compte">
          <Button variant="ghost" size="sm" className="gap-1.5 px-2">
            <div className="h-7 w-7 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center border border-primary/20">
              {initials}
            </div>
            <UserCircle className="h-4 w-4 hidden lg:inline" />
          </Button>
        </Link>
        <Button variant="outline" size="sm" onClick={logout} className="gap-1.5">
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Se deconnecter</span>
        </Button>
      </div>
    </header>
  );
}
