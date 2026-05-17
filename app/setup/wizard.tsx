"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type Step = 1 | 2 | 3;

type Admin = { name: string; email: string; password: string; password2: string };
type Company = {
  name: string;
  siret: string;
  vatNumber: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  currency: string;
  fiscalYearStart: string;
  fiscalYearEnd: string;
};
type Settings = {
  articleCodePrefix: string;
  articleCodePadding: number;
  uniqueCodePrefix: string;
  uniqueCodePadding: number;
  defaultStockAlert: number;
  timezone: string;
  language: string;
};

export default function SetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const year = new Date().getFullYear();
  const [admin, setAdmin] = useState<Admin>({ name: "", email: "", password: "", password2: "" });
  const [company, setCompany] = useState<Company>({
    name: "",
    siret: "",
    vatNumber: "",
    address: "",
    postalCode: "",
    city: "",
    country: "France",
    phone: "",
    email: "",
    currency: "EUR",
    fiscalYearStart: `${year}-01-01`,
    fiscalYearEnd: `${year}-12-31`,
  });
  const [settings, setSettings] = useState<Settings>({
    articleCodePrefix: "C",
    articleCodePadding: 6,
    uniqueCodePrefix: "",
    uniqueCodePadding: 6,
    defaultStockAlert: 100,
    timezone: "Europe/Paris",
    language: "fr",
  });

  const validStep1 =
    admin.name.trim().length >= 2 &&
    /^[^@]+@[^@]+\.[^@]+$/.test(admin.email) &&
    admin.password.length >= 8 &&
    admin.password === admin.password2;
  const validStep2 = company.name.trim().length >= 1 && company.fiscalYearStart && company.fiscalYearEnd;

  async function submit() {
    setLoading(true);
    setError(null);
    const payload = {
      admin: { name: admin.name, email: admin.email, password: admin.password },
      company,
      settings,
    };
    const res = await fetch("/api/setup/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Echec de la configuration");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Configuration initiale de l&apos;ERP</CardTitle>
        <CardDescription>Etape {step} / 3</CardDescription>
        <div className="flex gap-2 mt-3">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded ${s <= step ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === 1 && (
          <div className="space-y-3">
            <h3 className="font-semibold">1. Compte Administrateur</h3>
            <p className="text-sm text-muted-foreground">
              Ce premier compte aura tous les droits. Il pourra ensuite creer d&apos;autres utilisateurs.
            </p>
            <div>
              <Label>Nom complet</Label>
              <Input value={admin.name} onChange={(e) => setAdmin({ ...admin, name: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={admin.email}
                onChange={(e) => setAdmin({ ...admin, email: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Mot de passe (min 8 car.)</Label>
                <PasswordInput
                  value={admin.password}
                  onChange={(e) => setAdmin({ ...admin, password: e.target.value })}
                />
              </div>
              <div>
                <Label>Confirmation</Label>
                <PasswordInput
                  value={admin.password2}
                  onChange={(e) => setAdmin({ ...admin, password2: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <h3 className="font-semibold">2. Informations Societe</h3>
            <div>
              <Label>Raison sociale</Label>
              <Input value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>SIRET</Label>
                <Input value={company.siret} onChange={(e) => setCompany({ ...company, siret: e.target.value })} />
              </div>
              <div>
                <Label>N TVA intracom.</Label>
                <Input
                  value={company.vatNumber}
                  onChange={(e) => setCompany({ ...company, vatNumber: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Adresse</Label>
              <Input value={company.address} onChange={(e) => setCompany({ ...company, address: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Code postal</Label>
                <Input
                  value={company.postalCode}
                  onChange={(e) => setCompany({ ...company, postalCode: e.target.value })}
                />
              </div>
              <div>
                <Label>Ville</Label>
                <Input value={company.city} onChange={(e) => setCompany({ ...company, city: e.target.value })} />
              </div>
              <div>
                <Label>Pays</Label>
                <Input value={company.country} onChange={(e) => setCompany({ ...company, country: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Telephone</Label>
                <Input value={company.phone} onChange={(e) => setCompany({ ...company, phone: e.target.value })} />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={company.email} onChange={(e) => setCompany({ ...company, email: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Devise</Label>
                <Select
                  value={company.currency}
                  onChange={(e) => setCompany({ ...company, currency: e.target.value })}
                >
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                  <option value="CHF">CHF</option>
                </Select>
              </div>
              <div>
                <Label>Exercice - debut</Label>
                <Input
                  type="date"
                  value={company.fiscalYearStart}
                  onChange={(e) => setCompany({ ...company, fiscalYearStart: e.target.value })}
                />
              </div>
              <div>
                <Label>Exercice - fin</Label>
                <Input
                  type="date"
                  value={company.fiscalYearEnd}
                  onChange={(e) => setCompany({ ...company, fiscalYearEnd: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <h3 className="font-semibold">3. Parametres ERP</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Prefixe code article</Label>
                <Input
                  value={settings.articleCodePrefix}
                  onChange={(e) => setSettings({ ...settings, articleCodePrefix: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Exemple : &quot;{settings.articleCodePrefix}
                  {"0".repeat(settings.articleCodePadding)}&quot;.replace dernier 0 par 1
                </p>
              </div>
              <div>
                <Label>Padding code article</Label>
                <Input
                  type="number"
                  min={3}
                  max={10}
                  value={settings.articleCodePadding}
                  onChange={(e) =>
                    setSettings({ ...settings, articleCodePadding: Number(e.target.value) || 6 })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Prefixe code unique</Label>
                <Input
                  value={settings.uniqueCodePrefix}
                  onChange={(e) => setSettings({ ...settings, uniqueCodePrefix: e.target.value })}
                />
              </div>
              <div>
                <Label>Padding code unique</Label>
                <Input
                  type="number"
                  min={3}
                  max={10}
                  value={settings.uniqueCodePadding}
                  onChange={(e) =>
                    setSettings({ ...settings, uniqueCodePadding: Number(e.target.value) || 6 })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Seuil d&apos;alerte stock par defaut</Label>
              <Input
                type="number"
                min={0}
                value={settings.defaultStockAlert}
                onChange={(e) => setSettings({ ...settings, defaultStockAlert: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fuseau horaire</Label>
                <Select value={settings.timezone} onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}>
                  <option value="Europe/Paris">Europe/Paris</option>
                  <option value="Europe/London">Europe/London</option>
                  <option value="America/New_York">America/New_York</option>
                </Select>
              </div>
              <div>
                <Label>Langue</Label>
                <Select value={settings.language} onChange={(e) => setSettings({ ...settings, language: e.target.value })}>
                  <option value="fr">Francais</option>
                </Select>
              </div>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" disabled={step === 1 || loading} onClick={() => setStep((step - 1) as Step)}>
            Precedent
          </Button>
          {step < 3 ? (
            <Button
              onClick={() => setStep((step + 1) as Step)}
              disabled={(step === 1 && !validStep1) || (step === 2 && !validStep2)}
            >
              Suivant
            </Button>
          ) : (
            <Button onClick={submit} disabled={loading}>
              {loading ? "Installation..." : "Terminer"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
