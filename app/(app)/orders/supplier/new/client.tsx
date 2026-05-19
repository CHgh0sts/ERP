"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatEUR } from "@/lib/utils";
import { createSupplierOrder } from "../actions";

type SupArticle = { id: string; priceHT: number; moq: number; codeArticle: string; description: string };
type Sup = { id: string; name: string; articles: SupArticle[] };
type Line = { articleSupplierId: string; qtyOrdered: number; unitPriceHT: number; vatRateCode: string };

export default function NewOrderClient({
  suppliers,
  onCancel,
  onSuccess,
}: {
  suppliers: Sup[];
  onCancel?: () => void;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [supId, setSupId] = useState(suppliers[0]?.id ?? "");
  const [expectedAt, setExpectedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const supplier = suppliers.find((s) => s.id === supId);

  function addLine() {
    if (!supplier || supplier.articles.length === 0) return;
    const a = supplier.articles[0];
    setLines([...lines, { articleSupplierId: a.id, qtyOrdered: a.moq, unitPriceHT: a.priceHT, vatRateCode: "TVA20" }]);
  }

  function setLine(i: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function removeLine(i: number) {
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  }

  const totalHT = lines.reduce((s, l) => s + l.qtyOrdered * l.unitPriceHT, 0);
  const totalVat = lines.reduce((s, l) => {
    const rate = { TVA20: 20, TVA10: 10, TVA55: 5.5, TVA21: 2.1, TVA0: 0 }[l.vatRateCode] || 0;
    return s + l.qtyOrdered * l.unitPriceHT * (rate / 100);
  }, 0);

  async function submit() {
    setErr(null);
    start(async () => {
      try {
        const r = await createSupplierOrder({
          supplierId: supId,
          expectedAt: expectedAt || null,
          notes: notes || null,
          lines,
        });
        onSuccess?.();
        router.push(`/orders/supplier/${r.id}`);
        router.refresh();
      } catch (e) {
        setErr((e as Error).message);
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Entete</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Fournisseur</Label>
              <Select
                value={supId}
                onChange={(e) => {
                  setSupId(e.target.value);
                  setLines([]);
                }}
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Livraison prevue</Label>
              <Input type="date" value={expectedAt} onChange={(e) => setExpectedAt(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>Lignes</CardTitle>
          <Button size="sm" onClick={addLine} disabled={!supplier || supplier.articles.length === 0}>
            + Ajouter une ligne
          </Button>
        </CardHeader>
        <CardContent>
          {(!supplier || supplier.articles.length === 0) && (
            <p className="text-sm text-muted-foreground">
              Ce fournisseur n&apos;a aucun article lie. Ajoutez-les depuis la fiche composant.
            </p>
          )}
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-1">Article</th>
                <th>Qte</th>
                <th>Prix HT</th>
                <th>TVA</th>
                <th>Total HT</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => {
                const art = supplier?.articles.find((x) => x.id === l.articleSupplierId);
                return (
                  <tr key={i} className="border-b">
                    <td className="py-1">
                      <Select value={l.articleSupplierId} onChange={(e) => setLine(i, { articleSupplierId: e.target.value })}>
                        {supplier?.articles.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.codeArticle} - {a.description}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td>
                      <Input
                        type="number"
                        step="0.001"
                        value={l.qtyOrdered}
                        onChange={(e) => setLine(i, { qtyOrdered: Number(e.target.value) || 0 })}
                      />
                      {art && l.qtyOrdered < art.moq && (
                        <p className="text-xs text-destructive">MOQ {art.moq}</p>
                      )}
                    </td>
                    <td>
                      <Input
                        type="number"
                        step="0.0001"
                        value={l.unitPriceHT}
                        onChange={(e) => setLine(i, { unitPriceHT: Number(e.target.value) || 0 })}
                      />
                    </td>
                    <td>
                      <Select value={l.vatRateCode} onChange={(e) => setLine(i, { vatRateCode: e.target.value })}>
                        <option>TVA20</option>
                        <option>TVA10</option>
                        <option>TVA55</option>
                        <option>TVA21</option>
                        <option>TVA0</option>
                      </Select>
                    </td>
                    <td>{formatEUR(l.qtyOrdered * l.unitPriceHT)}</td>
                    <td>
                      <Button size="sm" variant="ghost" onClick={() => removeLine(i)}>
                        X
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="text-right mt-3 space-y-1 text-sm">
            <div>
              Total HT : <b>{formatEUR(totalHT)}</b>
            </div>
            <div>
              TVA : <b>{formatEUR(totalVat)}</b>
            </div>
            <div className="text-lg">
              Total TTC : <b>{formatEUR(totalHT + totalVat)}</b>
            </div>
          </div>
        </CardContent>
      </Card>

      {err && <p className="text-sm text-destructive">{err}</p>}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => (onCancel ? onCancel() : router.back())}>
          Annuler
        </Button>
        <Button onClick={submit} disabled={pending || lines.length === 0}>
          {pending ? "..." : "Creer la commande"}
        </Button>
      </div>
    </div>
  );
}
