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
import { createProduct, updateProduct, deleteProduct } from "./actions";

type Prod = {
  id: string;
  code: string;
  name: string;
  description: string;
  salePriceHT: string;
};

const empty: Prod = { id: "", code: "", name: "", description: "", salePriceHT: "" };

export default function ProductClient(props: {
  mode: "create" | "edit";
  product?: { id: string; code: string; name: string; description: string | null; salePriceHT: number | null };
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [p, setP] = useState<Prod>(
    props.product
      ? {
          id: props.product.id,
          code: props.product.code,
          name: props.product.name,
          description: props.product.description ?? "",
          salePriceHT: props.product.salePriceHT != null ? String(props.product.salePriceHT) : "",
        }
      : empty,
  );

  async function submit() {
    setErr(null);
    start(async () => {
      try {
        const payload = {
          code: p.code || null,
          name: p.name,
          description: p.description || null,
          salePriceHT: p.salePriceHT ? Number(p.salePriceHT) : null,
        };
        if (props.mode === "create") {
          await createProduct(payload);
          setP(empty);
        } else if (props.product) {
          await updateProduct(props.product.id, payload);
        }
        setOpen(false);
      } catch (e) {
        setErr((e as Error).message);
      }
    });
  }

  async function onDelete() {
    if (!props.product) return;
    if (!confirm("Supprimer ce produit ?")) return;
    start(async () => {
      try {
        await deleteProduct(props.product!.id);
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
            <Plus className="h-4 w-4" /> Nouveau produit
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
        title={props.mode === "create" ? "Nouveau produit" : "Modifier produit"}
        size="md"
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
            <div>
              <Label>Code (auto si vide)</Label>
              <Input value={p.code} disabled={props.mode === "edit"} onChange={(e) => setP({ ...p, code: e.target.value })} />
            </div>
            <div>
              <Label>Nom</Label>
              <Input value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <Textarea rows={2} value={p.description} onChange={(e) => setP({ ...p, description: e.target.value })} />
            </div>
            <div>
              <Label>Prix de vente HT</Label>
              <Input
                type="number"
                step="0.01"
                value={p.salePriceHT}
                onChange={(e) => setP({ ...p, salePriceHT: e.target.value })}
              />
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
