"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { ThemeSelector } from "@/components/theme/theme-toggle";
import { updateProfile, changeMyPassword } from "./actions";

type AccountUser = { id: string; name: string; email: string };

export function AccountClient({ user }: { user: AccountUser }) {
  return (
    <div className="space-y-8">
      <ProfileForm user={user} />
      <div className="pt-6 border-t">
        <h3 className="text-base font-semibold mb-1">Apparence</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Choisissez votre mode d&apos;affichage. Par defaut, l&apos;ERP suit les preferences de
          votre systeme.
        </p>
        <ThemeSelector />
      </div>
      <div className="pt-6 border-t">
        <PasswordSection />
      </div>
    </div>
  );
}

function ProfileForm({ user }: { user: AccountUser }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState(user.name);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  function submit() {
    setErr(null);
    setOk(false);
    start(async () => {
      try {
        await updateProfile({ name });
        setOk(true);
        router.refresh();
      } catch (e) {
        setErr((e as Error).message);
      }
    });
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-1.5">
        <Label>Nom affiche</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Email</Label>
        <Input value={user.email} disabled readOnly />
      </div>
      <div className="md:col-span-2 flex items-center justify-end gap-3">
        {err && <span className="text-sm text-destructive">{err}</span>}
        {ok && <span className="text-sm text-success">Modifie</span>}
        <Button onClick={submit} disabled={pending || !name.trim() || name === user.name}>
          {pending ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>
    </div>
  );
}

function PasswordSection() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [current, setCurrent] = useState("");
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(false);
    if (p1 !== p2) {
      setErr("Les mots de passe ne correspondent pas");
      return;
    }
    start(async () => {
      try {
        await changeMyPassword({
          currentPassword: current,
          newPassword: p1,
          confirmPassword: p2,
        });
        setOk(true);
        setCurrent("");
        setP1("");
        setP2("");
        setTimeout(() => {
          router.push("/login");
          router.refresh();
        }, 1500);
      } catch (e) {
        setErr((e as Error).message);
      }
    });
  }

  return (
    <Card className="border-warning/30">
      <CardHeader>
        <CardTitle className="text-base">Changer mon mot de passe</CardTitle>
        <CardDescription>
          Apres modification, vous serez deconnecte et devrez vous reconnecter.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4 max-w-md">
          <div className="space-y-1.5">
            <Label>Mot de passe actuel</Label>
            <PasswordInput
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Nouveau mot de passe (min 8 car.)</Label>
            <PasswordInput
              value={p1}
              onChange={(e) => setP1(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Confirmation</Label>
            <PasswordInput
              value={p2}
              onChange={(e) => setP2(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
            />
          </div>
          {err && (
            <Alert variant="destructive" title="Erreur">
              {err}
            </Alert>
          )}
          {ok && (
            <Alert variant="success" title="Mot de passe modifie">
              Redirection vers la page de connexion...
            </Alert>
          )}
          <Button type="submit" disabled={pending || ok}>
            {pending ? "Mise a jour..." : "Changer le mot de passe"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
