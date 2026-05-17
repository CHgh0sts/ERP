"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCustomer, updateCustomer, deleteCustomer } from "./actions";

type Cus = {
  id: string;
  code: string;
  name: string;
  vatNumber: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  paymentTerms: string;
  notes: string;
  accountCode: string;
};

const empty: Cus = {
  id: "",
  code: "",
  name: "",
  vatNumber: "",
  address: "",
  postalCode: "",
  city: "",
  country: "France",
  phone: "",
  email: "",
  website: "",
  paymentTerms: "",
  notes: "",
  accountCode: "",
};

export default function CustomerClient(props: { mode: "create" | "edit"; customer?: Cus }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [c, setC] = useState<Cus>(props.customer ?? empty);

  async function submit() {
    setErr(null);
    start(async () => {
      try {
        if (props.mode === "create") {
          await createCustomer({ ...c, code: c.code || null });
          setC(empty);
        } else if (props.customer) {
          await updateCustomer(props.customer.id, c);
        }
        setOpen(false);
      } catch (e) {
        setErr((e as Error).message);
      }
    });
  }

  async function onDelete() {
    if (!props.customer) return;
    if (!confirm("Supprimer ce client ?")) return;
    start(async () => {
      try {
        await deleteCustomer(props.customer!.id);
        setOpen(false);
      } catch (e) {
        setErr((e as Error).message);
      }
    });
  }

  if (!open) {
    return (
      <Button size="sm" variant={props.mode === "create" ? "default" : "outline"} onClick={() => setOpen(true)}>
        {props.mode === "create" ? "+ Nouveau client" : "Modifier"}
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-background rounded-lg p-6 w-full max-w-xl space-y-3 max-h-[90vh] overflow-y-auto">
        <h3 className="font-bold text-lg">{props.mode === "create" ? "Nouveau client" : "Modifier"}</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Code (auto si vide)" value={c.code} onChange={(v) => setC({ ...c, code: v })} disabled={props.mode === "edit"} />
          <Field label="Nom" value={c.name} onChange={(v) => setC({ ...c, name: v })} />
          <Field label="N TVA" value={c.vatNumber} onChange={(v) => setC({ ...c, vatNumber: v })} />
          <Field label="Compte comptable (411...)" value={c.accountCode} onChange={(v) => setC({ ...c, accountCode: v })} />
          <Field label="Adresse" value={c.address} onChange={(v) => setC({ ...c, address: v })} />
          <Field label="Pays" value={c.country} onChange={(v) => setC({ ...c, country: v })} />
          <Field label="Code postal" value={c.postalCode} onChange={(v) => setC({ ...c, postalCode: v })} />
          <Field label="Ville" value={c.city} onChange={(v) => setC({ ...c, city: v })} />
          <Field label="Telephone" value={c.phone} onChange={(v) => setC({ ...c, phone: v })} />
          <Field label="Email" value={c.email} onChange={(v) => setC({ ...c, email: v })} />
          <Field label="Site web" value={c.website} onChange={(v) => setC({ ...c, website: v })} />
          <Field label="Conditions de paiement" value={c.paymentTerms} onChange={(v) => setC({ ...c, paymentTerms: v })} />
        </div>
        <div>
          <Label>Notes</Label>
          <Textarea rows={2} value={c.notes} onChange={(e) => setC({ ...c, notes: e.target.value })} />
        </div>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <div className="flex justify-between border-t pt-2">
          <div>
            {props.mode === "edit" && (
              <Button variant="destructive" size="sm" onClick={onDelete} disabled={pending}>
                Supprimer
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Annuler
            </Button>
            <Button onClick={submit} disabled={pending}>
              {pending ? "..." : "Enregistrer"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
