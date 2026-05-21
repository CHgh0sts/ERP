"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { saveOfReservations } from "../actions";

type Article = { id: string; codeArticle: string; description: string };
type Line = {
  id?: string;
  articleId: string;
  qtyNeeded: number;
  reference: string;
  notes: string;
  unitCostHT: string;
};

export default function OfLinesEditor(props: {
  ofId: string;
  articles: Article[];
  lines: Line[];
  laborCostHT: number | null;
  overheadCostHT: number | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[]>(props.lines);
  const [labor, setLabor] = useState(props.laborCostHT != null ? String(props.laborCostHT) : "");
  const [overhead, setOverhead] = useState(props.overheadCostHT != null ? String(props.overheadCostHT) : "");

  function addLine() {
    const a = props.articles[0];
    if (!a) return;
    setLines([...lines, { articleId: a.id, qtyNeeded: 1, reference: "", notes: "", unitCostHT: "" }]);
  }

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function removeLine(i: number) {
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  }

  function save() {
    if (lines.length === 0) {
      setErr("Ajoutez au moins une ligne composant.");
      return;
    }
    setErr(null);
    start(async () => {
      try {
        await saveOfReservations(
          props.ofId,
          lines.map((l) => ({
            articleId: l.articleId,
            qtyNeeded: l.qtyNeeded,
            reference: l.reference || null,
            notes: l.notes || null,
            unitCostHT: l.unitCostHT === "" ? null : Number(l.unitCostHT),
          })),
          {
            laborCostHT: labor === "" ? null : Number(labor),
            overheadCostHT: overhead === "" ? null : Number(overhead),
          },
        );
        router.refresh();
      } catch (e) {
        setErr((e as Error).message);
      }
    });
  }

  if (props.articles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Composants de l&apos;OF (editable)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Aucun composant en base. Creez des articles d&apos;abord.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Composants de l&apos;OF (editable)</CardTitle>
        <Button type="button" size="sm" onClick={addLine}>
          + Ligne
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 max-w-md">
          <div>
            <Label>Main d&apos;oeuvre (HT)</Label>
            <Input type="number" step="0.01" min={0} value={labor} onChange={(e) => setLabor(e.target.value)} />
          </div>
          <div>
            <Label>Frais generaux (HT)</Label>
            <Input type="number" step="0.01" min={0} value={overhead} onChange={(e) => setOverhead(e.target.value)} />
          </div>
        </div>

        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="py-1">Ref PCB</th>
              <th>Composant</th>
              <th>Qte</th>
              <th>Prix unit. (opt.)</th>
              <th>Notes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={l.id ?? i} className="border-t">
                <td className="py-1">
                  <Input value={l.reference} onChange={(e) => updateLine(i, { reference: e.target.value })} />
                </td>
                <td>
                  <Select value={l.articleId} onChange={(e) => updateLine(i, { articleId: e.target.value })}>
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
                    min={0.000001}
                    value={l.qtyNeeded}
                    onChange={(e) => updateLine(i, { qtyNeeded: Number(e.target.value) || 0 })}
                  />
                </td>
                <td>
                  <Input
                    type="number"
                    step="0.0001"
                    min={0}
                    placeholder="Auto"
                    value={l.unitCostHT}
                    onChange={(e) => updateLine(i, { unitCostHT: e.target.value })}
                  />
                </td>
                <td>
                  <Input value={l.notes} onChange={(e) => updateLine(i, { notes: e.target.value })} />
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

        {err && <p className="text-sm text-destructive">{err}</p>}

        <div className="flex justify-end">
          <Button type="button" onClick={save} disabled={pending}>
            {pending ? "Enregistrement..." : "Enregistrer les composants"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
