"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/alert";
import { CrudModalFooter } from "@/components/ui/crud-modal-footer";
import { Plus, Pencil } from "lucide-react";
import { createSupplier, updateSupplier, deleteSupplier } from "./actions";

type Sup = {
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

const empty: Sup = {
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

export default function SupplierClient(props: { mode: "create" | "edit"; supplier?: Sup }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [s, setS] = useState<Sup>(props.supplier ?? empty);

  async function submit() {
    setErr(null);
    start(async () => {
      try {
        if (props.mode === "create") {
          await createSupplier({
            code: s.code || null,
            name: s.name,
            vatNumber: s.vatNumber,
            address: s.address,
            postalCode: s.postalCode,
            city: s.city,
            country: s.country,
            phone: s.phone,
            email: s.email,
            website: s.website,
            paymentTerms: s.paymentTerms,
            notes: s.notes,
            accountCode: s.accountCode,
          });
          setS(empty);
        } else if (props.supplier) {
          await updateSupplier(props.supplier.id, {
            name: s.name,
            vatNumber: s.vatNumber,
            address: s.address,
            postalCode: s.postalCode,
            city: s.city,
            country: s.country,
            phone: s.phone,
            email: s.email,
            website: s.website,
            paymentTerms: s.paymentTerms,
            notes: s.notes,
            accountCode: s.accountCode,
          });
        }
        setOpen(false);
      } catch (e) {
        setErr((e as Error).message);
      }
    });
  }

  async function onDelete() {
    if (!props.supplier) return;
    if (!confirm("Supprimer ce fournisseur ?")) return;
    start(async () => {
      try {
        await deleteSupplier(props.supplier!.id);
        setOpen(false);
      } catch (e) {
        setErr((e as Error).message);
      }
    });
  }

  return (
    <>
      <Button size="sm" variant={props.mode === "create" ? "default" : "outline"} onClick={() => setOpen(true)}>
        {props.mode === "create" ? (
          <>
            <Plus className="h-4 w-4" /> Nouveau fournisseur
          </>
        ) : (
          <>
            <Pencil className="h-3.5 w-3.5" /> Modifier
          </>
        )}
      </Button>

      <Modal
        open={open}
        onClose={() => !pending && setOpen(false)}
        title={props.mode === "create" ? "Nouveau fournisseur" : "Modifier"}
        size="lg"
        footer={
          <CrudModalFooter
            pending={pending}
            onClose={() => setOpen(false)}
            onSubmit={submit}
            onDelete={props.mode === "edit" ? onDelete : undefined}
          />
        }
      >
        <div className="space-y-4">
          {err && (
            <Alert variant="destructive" title="Erreur">
              {err}
            </Alert>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Code (auto si vide)" value={s.code} onChange={(v) => setS({ ...s, code: v })} disabled={props.mode === "edit"} />
            <Field label="Nom" value={s.name} onChange={(v) => setS({ ...s, name: v })} />
            <Field label="N TVA" value={s.vatNumber} onChange={(v) => setS({ ...s, vatNumber: v })} />
            <Field label="Compte comptable (401...)" value={s.accountCode} onChange={(v) => setS({ ...s, accountCode: v })} />
            <Field label="Adresse" value={s.address} onChange={(v) => setS({ ...s, address: v })} />
            <Field label="Pays" value={s.country} onChange={(v) => setS({ ...s, country: v })} />
            <Field label="Code postal" value={s.postalCode} onChange={(v) => setS({ ...s, postalCode: v })} />
            <Field label="Ville" value={s.city} onChange={(v) => setS({ ...s, city: v })} />
            <Field label="Telephone" value={s.phone} onChange={(v) => setS({ ...s, phone: v })} />
            <Field label="Email" value={s.email} onChange={(v) => setS({ ...s, email: v })} />
            <Field label="Site web" value={s.website} onChange={(v) => setS({ ...s, website: v })} />
            <Field label="Conditions de paiement" value={s.paymentTerms} onChange={(v) => setS({ ...s, paymentTerms: v })} />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea rows={2} value={s.notes} onChange={(e) => setS({ ...s, notes: e.target.value })} />
          </div>
        </div>
      </Modal>
    </>
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
