"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatEUR } from "@/lib/utils";
import { createSaleInvoice, createPurchaseInvoice } from "../actions";

type Party = { id: string; name: string };
type VatRate = { id: string; code: string; rate: number; isDefault: boolean };
type Line = { description: string; qty: number; unitPriceHT: number; vatRateId: string };

type CustomerOrderSrc = {
  id: string;
  code: string;
  customerId: string;
  customerName: string;
  lines: { description: string; qty: number; unitPriceHT: number; vatRateId: string | null }[];
};
type SupplierOrderSrc = {
  id: string;
  code: string;
  supplierId: string;
  supplierName: string;
  lines: { description: string; qty: number; unitPriceHT: number; vatRateCode: string }[];
};

export default function NewInvoiceClient(props: {
  type: "SALE" | "PURCHASE";
  prefillCustomerOrderId: string | null;
  prefillSupplierOrderId: string | null;
  customers: Party[];
  suppliers: Party[];
  vatRates: VatRate[];
  customerOrders: CustomerOrderSrc[];
  supplierOrders: SupplierOrderSrc[];
}) {
  const router = useRouter();
  const defaultVat = props.vatRates.find((v) => v.isDefault) ?? props.vatRates[0];
  const [partyId, setPartyId] = useState(
    props.type === "SALE" ? props.customers[0]?.id ?? "" : props.suppliers[0]?.id ?? "",
  );
  const [orderId, setOrderId] = useState<string>("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const vatByCode = new Map(props.vatRates.map((v) => [v.code, v.id]));

  useEffect(() => {
    if (!defaultVat) return;
    if (props.type === "SALE" && props.prefillCustomerOrderId) {
      applyCustomerOrder(props.prefillCustomerOrderId);
    }
    if (props.type === "PURCHASE" && props.prefillSupplierOrderId) {
      applySupplierOrder(props.prefillSupplierOrderId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyCustomerOrder(id: string) {
    const co = props.customerOrders.find((o) => o.id === id);
    if (!co) return;
    setOrderId(id);
    setPartyId(co.customerId);
    setLines(
      co.lines.map((l) => ({
        description: l.description,
        qty: l.qty,
        unitPriceHT: l.unitPriceHT,
        vatRateId: l.vatRateId ?? defaultVat?.id ?? "",
      })),
    );
  }

  function applySupplierOrder(id: string) {
    const so = props.supplierOrders.find((o) => o.id === id);
    if (!so) return;
    setOrderId(id);
    setPartyId(so.supplierId);
    setLines(
      so.lines.map((l) => ({
        description: l.description,
        qty: l.qty,
        unitPriceHT: l.unitPriceHT,
        vatRateId: vatByCode.get(l.vatRateCode) ?? defaultVat?.id ?? "",
      })),
    );
  }

  function addLine() {
    setLines([...lines, { description: "", qty: 1, unitPriceHT: 0, vatRateId: defaultVat?.id ?? "" }]);
  }
  function setLine(i: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function removeLine(i: number) {
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  }

  const totalHT = lines.reduce((s, l) => s + l.qty * l.unitPriceHT, 0);
  const totalVat = lines.reduce((s, l) => {
    const r = props.vatRates.find((x) => x.id === l.vatRateId)?.rate ?? 0;
    return s + l.qty * l.unitPriceHT * (r / 100);
  }, 0);

  async function submit() {
    setErr(null);
    start(async () => {
      try {
        const r =
          props.type === "SALE"
            ? await createSaleInvoice({
                customerId: partyId,
                customerOrderId: orderId || null,
                issueDate,
                dueDate: dueDate || null,
                notes: notes || null,
                lines,
              })
            : await createPurchaseInvoice({
                supplierId: partyId,
                supplierOrderId: orderId || null,
                issueDate,
                dueDate: dueDate || null,
                notes: notes || null,
                lines,
              });
        router.push(`/invoices/${r.id}`);
        router.refresh();
      } catch (e) {
        setErr((e as Error).message);
      }
    });
  }

  const parties = props.type === "SALE" ? props.customers : props.suppliers;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Entete</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{props.type === "SALE" ? "Client" : "Fournisseur"}</Label>
              <Select value={partyId} onChange={(e) => setPartyId(e.target.value)}>
                {parties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Commande liee (optionnel)</Label>
              <Select
                value={orderId}
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) {
                    setOrderId("");
                    return;
                  }
                  props.type === "SALE" ? applyCustomerOrder(v) : applySupplierOrder(v);
                }}
              >
                <option value="">-- aucune --</option>
                {props.type === "SALE"
                  ? props.customerOrders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.code} - {o.customerName}
                      </option>
                    ))
                  : props.supplierOrders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.code} - {o.supplierName}
                      </option>
                    ))}
              </Select>
            </div>
            <div>
              <Label>Date d&apos;emission</Label>
              <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>
            <div>
              <Label>Echeance</Label>
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Lignes</CardTitle>
          <Button size="sm" onClick={addLine}>
            + Ligne
          </Button>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-1">Description</th>
                <th>Qte</th>
                <th>Prix HT</th>
                <th>TVA</th>
                <th>Total HT</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i} className="border-t">
                  <td className="py-1">
                    <Input value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} />
                  </td>
                  <td>
                    <Input
                      type="number"
                      step="0.001"
                      value={l.qty}
                      onChange={(e) => setLine(i, { qty: Number(e.target.value) || 0 })}
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
                      {props.vatRates.map((v) => (
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
        <Button variant="outline" onClick={() => router.back()}>
          Annuler
        </Button>
        <Button onClick={submit} disabled={pending || lines.length === 0 || !partyId}>
          {pending ? "..." : "Creer la facture (brouillon)"}
        </Button>
      </div>
    </div>
  );
}
