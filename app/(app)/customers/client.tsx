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

  return (
    <>
      <Button size="sm" variant={props.mode === "create" ? "default" : "outline"} onClick={() => setOpen(true)}>
        {props.mode === "create" ? (
          <>
            <Plus className="h-4 w-4" /> Nouveau client
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
        title={props.mode === "create" ? "Nouveau client" : "Modifier"}
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
