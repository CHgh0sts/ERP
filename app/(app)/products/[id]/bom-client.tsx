"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/alert";
import { CrudModalFooter } from "@/components/ui/crud-modal-footer";
import { Plus, Pencil, Loader2 } from "lucide-react";
import { createBom, updateBom, deleteBom, setBomActive, getBomFormArticles } from "../actions";

type Article = { id: string; codeArticle: string; description: string };
type Line = { articleId: string; qtyPerUnit: number; reference: string; notes: string };
type Bom = { id: string; version: string; isActive: boolean; lines: Line[] };

export default function BomClient(props: {
  mode: "create" | "edit";
  productId: string;
  bom?: Bom;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [loadingArticles, startLoadArticles] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [version, setVersion] = useState(props.bom?.version ?? "1.0");
  const [isActive, setIsActive] = useState(props.bom?.isActive ?? false);
  const [lines, setLines] = useState<Line[]>(props.bom?.lines ?? []);

  function resetForm() {
    setVersion(props.bom?.version ?? "1.0");
    setIsActive(props.bom?.isActive ?? false);
    setLines(props.bom?.lines ?? []);
    setErr(null);
  }

  function addLine(list: Article[], current: Line[] = lines) {
    const a = list[0];
    if (!a) return current;
    return [...current, { articleId: a.id, qtyPerUnit: 1, reference: "", notes: "" }];
  }

  function openModal() {
    resetForm();
    setOpen(true);
    startLoadArticles(async () => {
      try {
        const loaded = await getBomFormArticles();
        setArticles(loaded);
        if (props.mode === "create" && loaded.length > 0) {
          setLines((prev) => (prev.length === 0 ? addLine(loaded, []) : prev));
        }
      } catch (e) {
        setErr((e as Error).message);
        setArticles([]);
      }
    });
  }

  function setLine(i: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function removeLine(i: number) {
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function submit() {
    if (lines.length === 0) {
      setErr("Ajoutez au moins une ligne composant.");
      return;
    }
    setErr(null);
    start(async () => {
      try {
        const payload = { productId: props.productId, version, isActive, lines };
        if (props.mode === "create") await createBom(payload);
        else if (props.bom) await updateBom(props.bom.id, payload);
        setOpen(false);
        router.refresh();
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
        router.refresh();
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
        router.refresh();
      } catch (e) {
        setErr((e as Error).message);
      }
    });
  }

  return (
    <>
      <div className="flex gap-2">
        {props.mode === "edit" && props.bom && !props.bom.isActive && (
          <Button type="button" size="sm" variant="outline" onClick={activate} disabled={pending}>
            Activer
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant={props.mode === "create" ? "default" : "outline"}
          onClick={openModal}
        >
          {props.mode === "create" ? (
            <>
              <Plus className="h-4 w-4" /> Nouvelle BOM
            </>
          ) : (
            <>
              <Pencil className="h-3.5 w-3.5" /> Modifier
            </>
          )}
        </Button>
      </div>

      {open ? (
        <Modal
          open={open}
          onClose={() => !pending && setOpen(false)}
          title={props.mode === "create" ? "Nouvelle BOM" : `Modifier BOM v${props.bom?.version}`}
          size="xl"
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

            {loadingArticles && articles.length === 0 ? (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Chargement des composants...
              </p>
            ) : null}

            {!loadingArticles && articles.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun composant disponible.{" "}
                <Link href="/components" className="text-primary underline">
                  Creez des composants
                </Link>{" "}
                avant d&apos;ajouter une BOM.
              </p>
            ) : null}

            {articles.length > 0 ? (
              <>
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
                    <Button type="button" size="sm" onClick={() => setLines(addLine(articles))}>
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
                          <Input
                            value={l.reference}
                            onChange={(e) => setLine(i, { reference: e.target.value })}
                            placeholder="R1, C3..."
                          />
                        </td>
                        <td>
                          <Select value={l.articleId} onChange={(e) => setLine(i, { articleId: e.target.value })}>
                            {articles.map((a) => (
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
                            min={0.000001}
                            value={l.qtyPerUnit}
                            onChange={(e) => setLine(i, { qtyPerUnit: Number(e.target.value) || 0 })}
                          />
                        </td>
                        <td>
                          <Input value={l.notes} onChange={(e) => setLine(i, { notes: e.target.value })} />
                        </td>
                        <td>
                          <Button type="button" size="sm" variant="ghost" onClick={() => removeLine(i)}>
                            X
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {lines.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Cliquez sur &quot;+ Ligne&quot; pour ajouter un composant.</p>
                ) : null}
              </>
            ) : null}
          </div>
        </Modal>
      ) : null}
    </>
  );
}
