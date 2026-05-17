"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/alert";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { createArticle, updateArticle, deleteArticle } from "./actions";

type Art = {
  id: string;
  codeArticle: string;
  mpn: string;
  description: string;
  componentType: string;
  format: string;
  value: string;
  stockAlert: number;
  lastPurchasePrice: number | null;
  notes: string;
};

const empty: Art = {
  id: "",
  codeArticle: "",
  mpn: "",
  description: "",
  componentType: "OTHER",
  format: "",
  value: "",
  stockAlert: 0,
  lastPurchasePrice: null,
  notes: "",
};

const TYPES = [
  ["RESISTOR", "Resistance"],
  ["CAPACITOR", "Condensateur"],
  ["INDUCTOR", "Inductance"],
  ["IC", "Circuit integre"],
  ["TRANSISTOR", "Transistor"],
  ["DIODE", "Diode"],
  ["CONNECTOR", "Connecteur"],
  ["PCB", "PCB"],
  ["MECHANICAL", "Mecanique"],
  ["OTHER", "Autre"],
] as const;

export default function ArticleClient(props: { mode: "create" | "edit"; article?: Art }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [a, setA] = useState<Art>(props.article ?? empty);

  async function submit() {
    setErr(null);
    start(async () => {
      try {
        if (props.mode === "create") {
          await createArticle({
            codeArticle: a.codeArticle || null,
            mpn: a.mpn || null,
            description: a.description,
            componentType: a.componentType,
            format: a.format || null,
            value: a.value || null,
            stockAlert: a.stockAlert,
            lastPurchasePrice: a.lastPurchasePrice ?? null,
            notes: a.notes || null,
          });
          setA(empty);
        } else if (props.article) {
          await updateArticle(props.article.id, {
            mpn: a.mpn || null,
            description: a.description,
            componentType: a.componentType,
            format: a.format || null,
            value: a.value || null,
            stockAlert: a.stockAlert,
            lastPurchasePrice: a.lastPurchasePrice ?? null,
            notes: a.notes || null,
          });
        }
        setOpen(false);
      } catch (e) {
        setErr((e as Error).message);
      }
    });
  }

  async function onDelete() {
    if (!props.article) return;
    if (!confirm("Supprimer cet article ?")) return;
    start(async () => {
      try {
        await deleteArticle(props.article!.id);
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
            <Plus className="h-4 w-4" /> Nouvel article
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
        title={props.mode === "create" ? "Nouvel article" : "Modifier l'article"}
        description="Les champs marques d'une * sont obligatoires."
        footer={
          <div className="flex items-center justify-between w-full">
            <div>
              {props.mode === "edit" && (
                <Button variant="destructive" size="sm" onClick={onDelete} disabled={pending}>
                  <Trash2 className="h-3.5 w-3.5" /> Supprimer
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                Annuler
              </Button>
              <Button onClick={submit} disabled={pending}>
                {pending ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {err && (
            <Alert variant="destructive" title="Impossible d'enregistrer">
              {err}
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>
                Code article <span className="text-muted-foreground font-normal">(auto si vide)</span>
              </Label>
              <Input
                value={a.codeArticle}
                onChange={(e) => setA({ ...a, codeArticle: e.target.value })}
                disabled={props.mode === "edit"}
                placeholder="Ex : C000001"
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                MPN <span className="text-muted-foreground font-normal">(ref fabricant)</span>
              </Label>
              <Input value={a.mpn} onChange={(e) => setA({ ...a, mpn: e.target.value })} placeholder="Ex : C0603X7R..." />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>
                Description <span className="text-destructive">*</span>
              </Label>
              <Input
                value={a.description}
                onChange={(e) => setA({ ...a, description: e.target.value })}
                placeholder="Ex : Condensateur ceramique 10uF 25V X7R 0603"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={a.componentType} onChange={(e) => setA({ ...a, componentType: e.target.value })}>
                {TYPES.map(([v, lbl]) => (
                  <option key={v} value={v}>
                    {lbl}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Format</Label>
              <Input value={a.format} onChange={(e) => setA({ ...a, format: e.target.value })} placeholder="0402, QFN48, ..." />
            </div>
            <div className="space-y-1.5">
              <Label>Valeur</Label>
              <Input value={a.value} onChange={(e) => setA({ ...a, value: e.target.value })} placeholder="10k, 100nF, ..." />
            </div>
            <div className="space-y-1.5">
              <Label>Seuil d&apos;alerte</Label>
              <Input
                type="number"
                value={a.stockAlert}
                onChange={(e) => setA({ ...a, stockAlert: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Dernier prix d&apos;achat HT (EUR)</Label>
              <Input
                type="number"
                step="0.0001"
                value={a.lastPurchasePrice ?? ""}
                onChange={(e) =>
                  setA({ ...a, lastPurchasePrice: e.target.value === "" ? null : Number(e.target.value) })
                }
                placeholder="0.0000"
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={3} value={a.notes} onChange={(e) => setA({ ...a, notes: e.target.value })} />
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
