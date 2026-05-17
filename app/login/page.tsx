import { Suspense } from "react";
import LoginForm from "./form";

export const metadata = { title: "Connexion - ERP" };
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Suspense fallback={<div className="text-sm text-muted-foreground">Chargement...</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
