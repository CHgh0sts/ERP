"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createManufacturingOrder } from "../actions";

type Prod = {
  id: string;
  code: string;
  name: string;
  boms: { id: string; version: string; isActive: boolean }[];
};

export default function NewOfClient({ products }: { products: Prod[] }) {
  const router = useRouter();
  const [productId, setProductId] = useState(products[0].id);
  const product = products.find((p) => p.id === productId)!;
  const activeBom = product.boms.find((b) => b.isActive) ?? product.boms[0];
  const [bomId, setBomId] = useState(activeBom.id);
  const [qty, setQty] = useState(1);
  const [plannedStart, setPlannedStart] = useState("");
  const [plannedEnd, setPlannedEnd] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    start(async () => {
      try {
        const r = await createManufacturingOrder({
          productId,
          bomId,
          qty,
          plannedStart: plannedStart || null,
          plannedEnd: plannedEnd || null,
          notes: notes || null,
          customerOrderId: null,
        });
        router.push(`/manufacturing/${r.id}`);
        router.refresh();
      } catch (e) {
        setErr((e as Error).message);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entete</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Produit</Label>
            <Select
              value={productId}
              onChange={(e) => {
                const id = e.target.value;
                setProductId(id);
                const p = products.find((x) => x.id === id)!;
                const active = p.boms.find((b) => b.isActive) ?? p.boms[0];
                setBomId(active.id);
              }}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>BOM</Label>
            <Select value={bomId} onChange={(e) => setBomId(e.target.value)}>
              {product.boms.map((b) => (
                <option key={b.id} value={b.id}>
                  v{b.version} {b.isActive ? "(actif)" : ""}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Quantite a produire</Label>
            <Input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value) || 1)} />
          </div>
          <div />
          <div>
            <Label>Debut prevu</Label>
            <Input type="date" value={plannedStart} onChange={(e) => setPlannedStart(e.target.value)} />
          </div>
          <div>
            <Label>Fin prevue</Label>
            <Input type="date" value={plannedEnd} onChange={(e) => setPlannedEnd(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Notes</Label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "..." : "Creer l'OF"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
