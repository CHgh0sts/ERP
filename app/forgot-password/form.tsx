"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { ArrowLeft } from "lucide-react";

export default function ForgotForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const r = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await r.json()) as { ok?: boolean; error?: string; message?: string };
      if (!r.ok) {
        setError(data.error ?? "Erreur inconnue");
      } else {
        setMessage(data.message ?? "Demande envoyee");
      }
    } catch {
      setError("Erreur reseau");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Mot de passe oublie</CardTitle>
        <CardDescription>
          Saisissez votre email. Un lien de reinitialisation sera genere et communique par votre
          administrateur.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          {error && (
            <Alert variant="destructive" title="Erreur">
              {error}
            </Alert>
          )}
          {message && (
            <Alert variant="success" title="Demande enregistree">
              {message}
            </Alert>
          )}
          <Button type="submit" className="w-full" disabled={loading || !!message}>
            {loading ? "Envoi..." : "Envoyer la demande"}
          </Button>
          <div className="pt-2 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Retour a la connexion
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
