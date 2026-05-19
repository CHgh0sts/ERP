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
import { createCustomerOrder } from "../actions";

type Customer = { id: string; name: string };
type Product = { id: string; code: string; name: string; salePriceHT: number };
type VatRate = { id: string; code: string; rate: number; isDefault: boolean };
type Line = {
  productId: string;
  qty: number;
  unitPriceHT: number;
  vatRateId: string;
  description: string;
};

export default function NewCustomerOrderClient({
  customers,
  products,
  vatRates,
  onCancel,
  onSuccess,
}: {
  customers: Customer[];
  products: Product[];
  vatRates: VatRate[];
  onCancel?: () => void;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const defaultVat = vatRates.find((v) => v.isDefault) ?? vatRates[0];
  const [customerId, setCustomerId] = useState(customers[0].id);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function addLine() {
    const p = products[0];
    setLines([
      ...lines,
      { productId: p.id, qty: 1, unitPriceHT: p.salePriceHT, vatRateId: defaultVat?.id ?? "", description: "" },
    ]);
  }
  function setLine(i: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function removeLine(i: number) {
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  }

  const totalHT = lines.reduce((s, l) => s + l.qty * l.unitPriceHT, 0);
  const totalVat = lines.reduce((s, l) => {
    const r = vatRates.find((x) => x.id === l.vatRateId)?.rate ?? 0;
    return s + l.qty * l.unitPriceHT * (r / 100);
  }, 0);

  async function submit() {
    setErr(null);
    start(async () => {
      try {
        const r = await createCustomerOrder({
          customerId,
          dueDate: dueDate || null,
          notes: notes || null,
          lines,
        });
        onSuccess?.();
        router.push(`/orders/customer/${r.id}`);
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
              <Label>Client</Label>
              <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Date d&apos;echeance</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
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
          <Button size="sm" onClick={addLine}>
            + Ajouter une ligne
          </Button>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-1">Produit</th>
                <th>Description</th>
                <th>Qte</th>
                <th>Prix HT</th>
                <th>TVA</th>
                <th>Total HT</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i} className="border-b">
                  <td className="py-1">
                    <Select
                      value={l.productId}
                      onChange={(e) => {
                        const p = products.find((x) => x.id === e.target.value);
                        setLine(i, { productId: e.target.value, unitPriceHT: p?.salePriceHT ?? 0 });
                      }}
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.code} - {p.name}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td>
                    <Input value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} />
                  </td>
                  <td>
                    <Input
                      type="number"
                      min={1}
                      value={l.qty}
                      onChange={(e) => setLine(i, { qty: Number(e.target.value) || 1 })}
                    />
                  </td>
                  <td>
                    <Input
                      type="number"
                      step="0.01"
                      value={l.unitPriceHT}
                      onChange={(e) => setLine(i, { unitPriceHT: Number(e.target.value) || 0 })}
                    />
                  </td>
                  <td>
                    <Select value={l.vatRateId} onChange={(e) => setLine(i, { vatRateId: e.target.value })}>
                      {vatRates.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.code} ({v.rate}%)
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td>{formatEUR(l.qty * l.unitPriceHT)}</td>
                  <td>
                    <Button size="sm" variant="ghost" onClick={() => removeLine(i)}>
                      X
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-right mt-3 space-y-1 text-sm">
            <div>Total HT : <b>{formatEUR(totalHT)}</b></div>
            <div>TVA : <b>{formatEUR(totalVat)}</b></div>
            <div className="text-lg">Total TTC : <b>{formatEUR(totalHT + totalVat)}</b></div>
          </div>
        </CardContent>
      </Card>

      {err && <p className="text-sm text-destructive">{err}</p>}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => (onCancel ? onCancel() : router.back())}>
          Annuler
        </Button>
        <Button onClick={submit} disabled={pending || lines.length === 0}>
          {pending ? "..." : "Creer le devis"}
        </Button>
      </div>
    </div>
  );
}
