"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { saveSettings } from "./actions";

type Cfg = {
  articleCodePrefix: string;
  articleCodePadding: number;
  uniqueCodePrefix: string;
  uniqueCodePadding: number;
  ofCodePrefix: string;
  ofCodePadding: number;
  invoiceCodePrefix: string;
  invoiceCodePadding: number;
  defaultStockAlert: number;
  timezone: string;
  language: string;
};
type Company = {
  id: string;
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

export default function SettingsForm(props: { cfg: Cfg; company: Company }) {
  const [cfg, setCfg] = useState(props.cfg);
  const [company, setCompany] = useState(props.company);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  async function submit() {
    setMsg(null);
    start(async () => {
      try {
        await saveSettings({ company, cfg });
        setMsg("Enregistre");
      } catch (e) {
        setMsg("Erreur : " + (e as Error).message);
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Societe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Raison sociale" value={company.name} onChange={(v) => setCompany({ ...company, name: v })} />
            <Field label="Devise" value={company.currency} onChange={(v) => setCompany({ ...company, currency: v })} />
            <Field label="SIRET" value={company.siret} onChange={(v) => setCompany({ ...company, siret: v })} />
            <Field label="N TVA" value={company.vatNumber} onChange={(v) => setCompany({ ...company, vatNumber: v })} />
            <Field label="Adresse" value={company.address} onChange={(v) => setCompany({ ...company, address: v })} />
            <Field label="Pays" value={company.country} onChange={(v) => setCompany({ ...company, country: v })} />
            <Field label="Code postal" value={company.postalCode} onChange={(v) => setCompany({ ...company, postalCode: v })} />
            <Field label="Ville" value={company.city} onChange={(v) => setCompany({ ...company, city: v })} />
            <Field label="Telephone" value={company.phone} onChange={(v) => setCompany({ ...company, phone: v })} />
            <Field label="Email" value={company.email} onChange={(v) => setCompany({ ...company, email: v })} />
            <Field
              label="Debut exercice"
              type="date"
              value={company.fiscalYearStart}
              onChange={(v) => setCompany({ ...company, fiscalYearStart: v })}
            />
            <Field
              label="Fin exercice"
              type="date"
              value={company.fiscalYearEnd}
              onChange={(v) => setCompany({ ...company, fiscalYearEnd: v })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Parametres ERP</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-4 gap-3">
            <Field label="Prefixe article" value={cfg.articleCodePrefix} onChange={(v) => setCfg({ ...cfg, articleCodePrefix: v })} />
            <Field label="Padding article" type="number" value={String(cfg.articleCodePadding)} onChange={(v) => setCfg({ ...cfg, articleCodePadding: Number(v) || 6 })} />
            <Field label="Prefixe code unique" value={cfg.uniqueCodePrefix} onChange={(v) => setCfg({ ...cfg, uniqueCodePrefix: v })} />
            <Field label="Padding code unique" type="number" value={String(cfg.uniqueCodePadding)} onChange={(v) => setCfg({ ...cfg, uniqueCodePadding: Number(v) || 6 })} />
            <Field label="Prefixe OF" value={cfg.ofCodePrefix} onChange={(v) => setCfg({ ...cfg, ofCodePrefix: v })} />
            <Field label="Padding OF" type="number" value={String(cfg.ofCodePadding)} onChange={(v) => setCfg({ ...cfg, ofCodePadding: Number(v) || 6 })} />
            <Field label="Prefixe facture" value={cfg.invoiceCodePrefix} onChange={(v) => setCfg({ ...cfg, invoiceCodePrefix: v })} />
            <Field label="Padding facture" type="number" value={String(cfg.invoiceCodePadding)} onChange={(v) => setCfg({ ...cfg, invoiceCodePadding: Number(v) || 6 })} />
            <Field label="Seuil stock defaut" type="number" value={String(cfg.defaultStockAlert)} onChange={(v) => setCfg({ ...cfg, defaultStockAlert: Number(v) || 0 })} />
            <Field label="Fuseau" value={cfg.timezone} onChange={(v) => setCfg({ ...cfg, timezone: v })} />
            <Field label="Langue" value={cfg.language} onChange={(v) => setCfg({ ...cfg, language: v })} />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 items-center">
        <Button onClick={submit} disabled={pending}>
          {pending ? "Enregistrement..." : "Enregistrer"}
        </Button>
        {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
