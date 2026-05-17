"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

type Validity =
  | { state: "loading" }
  | { state: "invalid" }
  | { state: "valid"; email: string; expiresAt: string };

export default function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [validity, setValidity] = useState<Validity>({ state: "loading" });
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(
          `/api/auth/reset-password?token=${encodeURIComponent(token)}`,
          { cache: "no-store" },
        );
        const d = (await r.json()) as {
          valid: boolean;
          email?: string;
          expiresAt?: string;
        };
        if (cancelled) return;
        if (d.valid && d.email && d.expiresAt) {
          setValidity({ state: "valid", email: d.email, expiresAt: d.expiresAt });
        } else {
          setValidity({ state: "invalid" });
        }
      } catch {
        if (!cancelled) setValidity({ state: "invalid" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== password2) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }
    if (password.length < 8) {
      setError("Mot de passe : minimum 8 caracteres");
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, password2 }),
      });
      const d = (await r.json()) as { ok?: boolean; error?: string };
      if (!r.ok || !d.ok) {
        setError(d.error ?? "Erreur inconnue");
      } else {
        setDone(true);
        setTimeout(() => router.push("/login"), 2500);
      }
    } catch {
      setError("Erreur reseau");
    } finally {
      setSubmitting(false);
    }
  }

  if (validity.state === "loading") {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Verification...</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Verification du lien en cours.</p>
        </CardContent>
      </Card>
    );
  }

  if (validity.state === "invalid") {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Lien invalide</CardTitle>
          <CardDescription>
            Ce lien est invalide, a deja ete utilise, ou a expire.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert variant="destructive" title="Acces refuse">
            Demandez un nouveau lien de reinitialisation a votre administrateur.
          </Alert>
          <div className="flex gap-2">
            <Link href="/forgot-password" className="flex-1">
              <Button variant="outline" className="w-full">
                Nouvelle demande
              </Button>
            </Link>
            <Link href="/login" className="flex-1">
              <Button className="w-full">Connexion</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const expires = new Date(validity.expiresAt);
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Nouveau mot de passe</CardTitle>
        <CardDescription>
          Pour : <span className="font-medium text-foreground">{validity.email}</span>
          <br />
          <span className="text-xs">
            Lien valide jusqu&apos;au {expires.toLocaleString("fr-FR")}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {done ? (
          <Alert variant="success" title="Mot de passe mis a jour">
            Redirection vers la page de connexion...
          </Alert>
        ) : (
          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <Label>Nouveau mot de passe (min 8 caracteres)</Label>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>
            <div>
              <Label>Confirmation</Label>
              <PasswordInput
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>
            {error && (
              <Alert variant="destructive" title="Erreur">
                {error}
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Mise a jour..." : "Mettre a jour le mot de passe"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
