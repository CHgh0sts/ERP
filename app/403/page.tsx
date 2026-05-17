import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ForbiddenPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-6xl font-bold">403</h1>
      <p className="text-muted-foreground">Vous n&apos;avez pas la permission d&apos;acceder a cette page.</p>
      <Button asChild>
        <Link href="/dashboard">Retour au tableau de bord</Link>
      </Button>
    </main>
  );
}
