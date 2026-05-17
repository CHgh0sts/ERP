import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatEUR, formatDate, formatDateTime } from "@/lib/utils";
import InvoiceClient from "./client";

export const dynamic = "force-dynamic";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("invoices.read");
  const { id } = await params;
  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: true,
      supplier: true,
      customerOrder: true,
      supplierOrder: true,
      lines: { include: { vatRate: true } },
      payments: { orderBy: { at: "desc" } },
      journalEntry: { include: { lines: { include: { account: true } }, journal: true } },
    },
  });
  if (!inv) notFound();

  const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
  const remaining = inv.totalTTC - paid;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">
            Facture <span className="font-mono">{inv.code}</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            <Badge variant={inv.type === "SALE" ? "default" : "secondary"} className="mr-2">
              {inv.type === "SALE" ? "Vente" : "Achat"}
            </Badge>
            {inv.customer?.name ?? inv.supplier?.name}
            &nbsp;- Emise le {formatDate(inv.issueDate)}
            {inv.dueDate && " - Echeance " + formatDate(inv.dueDate)}
          </p>
        </div>
        <Badge variant={inv.status === "CANCELLED" ? "destructive" : "default"}>{inv.status}</Badge>
      </div>

      <InvoiceClient
        invoiceId={inv.id}
        status={inv.status}
        totalTTC={inv.totalTTC}
        paid={paid}
        remaining={remaining}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Lignes</CardTitle>
          <Link href={`/api/invoices/${inv.id}/pdf`} target="_blank" className="text-sm underline">
            Imprimer / PDF
          </Link>
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
              </tr>
            </thead>
            <tbody>
              {inv.lines.map((l) => (
                <tr key={l.id} className="border-t">
                  <td className="py-1">{l.description}</td>
                  <td>{l.qty}</td>
                  <td>{formatEUR(l.unitPriceHT)}</td>
                  <td>{l.vatRate?.code ?? "-"}</td>
                  <td>{formatEUR(l.qty * l.unitPriceHT)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-right mt-3 space-y-1 text-sm">
            <div>Total HT : <b>{formatEUR(inv.totalHT)}</b></div>
            <div>TVA : <b>{formatEUR(inv.totalVat)}</b></div>
            <div className="text-lg">Total TTC : <b>{formatEUR(inv.totalTTC)}</b></div>
            <div>Paye : <b>{formatEUR(paid)}</b></div>
            <div className={remaining > 0.005 ? "text-destructive" : "text-emerald-600"}>
              Reste : <b>{formatEUR(remaining)}</b>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Paiements</CardTitle>
        </CardHeader>
        <CardContent>
          {inv.payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun paiement</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-1">Date</th>
                  <th>Methode</th>
                  <th>Montant</th>
                  <th>Reference</th>
                </tr>
              </thead>
              <tbody>
                {inv.payments.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="py-1">{formatDateTime(p.at)}</td>
                    <td>{p.method}</td>
                    <td>{formatEUR(p.amount)}</td>
                    <td>{p.reference ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {inv.journalEntry && (
        <Card>
          <CardHeader>
            <CardTitle>Ecriture comptable ({inv.journalEntry.journal.code})</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-1">Compte</th>
                  <th>Libelle</th>
                  <th>Debit</th>
                  <th>Credit</th>
                </tr>
              </thead>
              <tbody>
                {inv.journalEntry.lines.map((l) => (
                  <tr key={l.id} className="border-t">
                    <td className="py-1 font-mono text-xs">
                      {l.account.number} {l.account.label}
                    </td>
                    <td>{l.label}</td>
                    <td>{l.debit > 0 ? formatEUR(l.debit) : ""}</td>
                    <td>{l.credit > 0 ? formatEUR(l.credit) : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
