"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createBom, updateBom, deleteBom, setBomActive } from "../actions";

type Article = { id: string; codeArticle: string; description: string };
type Line = { articleId: string; qtyPerUnit: number; reference: string; notes: string };
type Bom = { id: string; version: string; isActive: boolean; lines: Line[] };

export default function BomClient(props: {
  mode: "create" | "edit";
  productId: string;
  articles: Article[];
  bom?: Bom;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [version, setVersion] = useState(props.bom?.version ?? "1.0");
  const [isActive, setIsActive] = useState(props.bom?.isActive ?? false);
  const [lines, setLines] = useState<Line[]>(props.bom?.lines ?? []);

  function addLine() {
    const a = props.articles[0];
    if (!a) return;
    setLines([...lines, { articleId: a.id, qtyPerUnit: 1, reference: "", notes: "" }]);
  }
  function setLine(i: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function removeLine(i: number) {
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function submit() {
    setErr(null);
    start(async () => {
      try {
        const payload = { productId: props.productId, version, isActive, lines };
        if (props.mode === "create") await createBom(payload);
        else if (props.bom) await updateBom(props.bom.id, payload);
        setOpen(false);
      } catch (e) {
        setErr((e as Error).message);
      }
    });
  }

  async function activate() {
    if (!props.bom) return;
    start(async () => {
      try {
        await setBomActive(props.bom!.id);
      } catch (e) {
        setErr((e as Error).message);
      }
    });
  }

  async function onDelete() {
    if (!props.bom) return;
    if (!confirm("Supprimer cette BOM ?")) return;
    start(async () => {
      try {
        await deleteBom(props.bom!.id);
        setOpen(false);
      } catch (e) {
        setErr((e as Error).message);
      }
    });
  }

  if (!open) {
    return (
      <div className="flex gap-2">
        {props.mode === "edit" && props.bom && !props.bom.isActive && (
          <Button size="sm" variant="outline" onClick={activate} disabled={pending}>
            Activer
          </Button>
        )}
        <Button size="sm" variant={props.mode === "create" ? "default" : "outline"} onClick={() => setOpen(true)}>
          {props.mode === "create" ? "+ Nouvelle BOM" : "Modifier"}
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-background rounded-lg p-6 w-full max-w-3xl space-y-3 max-h-[90vh] overflow-y-auto">
        <h3 className="font-bold text-lg">{props.mode === "create" ? "Nouvelle BOM" : `Modifier BOM v${props.bom?.version}`}</h3>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Version</Label>
            <Input value={version} onChange={(e) => setVersion(e.target.value)} />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              Activer (desactive les autres versions)
            </label>
          </div>
          <div className="flex items-end justify-end">
            <Button size="sm" onClick={addLine} disabled={props.articles.length === 0}>
              + Ligne
            </Button>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="py-1">Ref PCB</th>
              <th>Composant</th>
              <th>Qte / unite</th>
              <th>Notes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="border-t">
                <td className="py-1">
                  <Input value={l.reference} onChange={(e) => setLine(i, { reference: e.target.value })} placeholder="R1, C3..." />
                </td>
                <td>
                  <Select value={l.articleId} onChange={(e) => setLine(i, { articleId: e.target.value })}>
                    {props.articles.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.codeArticle} - {a.description}
                      </option>
                    ))}
                  </Select>
                </td>
                <td>
                  <Input
                    type="number"
                    step="0.000001"
                    value={l.qtyPerUnit}
                    onChange={(e) => setLine(i, { qtyPerUnit: Number(e.target.value) || 0 })}
                  />
                </td>
                <td>
                  <Input value={l.notes} onChange={(e) => setLine(i, { notes: e.target.value })} />
                </td>
                <td>
                  <Button size="sm" variant="ghost" onClick={() => removeLine(i)}>
                    X
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

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
            <Button onClick={submit} disabled={pending || lines.length === 0}>
              {pending ? "..." : "Enregistrer"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
