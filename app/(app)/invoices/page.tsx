import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { CreateInvoiceDialog } from "./create-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatEUR, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  await requirePermission("invoices.read");
  const [invoices, customers, suppliers, vatRates, customerOrders, supplierOrders] =
    await Promise.all([
      prisma.invoice.findMany({
    orderBy: { issueDate: "desc" },
    include: { customer: true, supplier: true, payments: true },
      }),
      prisma.customer.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
      prisma.supplier.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
      prisma.vatRate.findMany({ orderBy: { rate: "desc" } }),
      prisma.customerOrder.findMany({
        where: { status: { notIn: ["CANCELLED", "INVOICED"] } },
        include: { customer: true, lines: { include: { product: true, vatRate: true } } },
        orderBy: { orderDate: "desc" },
      }),
      prisma.supplierOrder.findMany({
        where: { status: { notIn: ["CANCELLED", "DRAFT"] } },
        include: {
          supplier: true,
          lines: { include: { articleSupplier: { include: { article: true } } } },
        },
        orderBy: { orderDate: "desc" },
      }),
    ]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Factures</h1>
        <CreateInvoiceDialog
          customers={customers.map((c) => ({ id: c.id, name: c.name }))}
          suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
          vatRates={vatRates.map((v) => ({
            id: v.id,
            code: v.code,
            rate: v.rate,
            isDefault: v.isDefault,
          }))}
          customerOrders={customerOrders.map((o) => ({
            id: o.id,
            code: o.code,
            customerId: o.customerId,
            customerName: o.customer.name,
            lines: o.lines.map((l) => ({
              description: `${l.product.code} - ${l.product.name}${l.description ? " - " + l.description : ""}`,
              qty: l.qty,
              unitPriceHT: l.unitPriceHT,
              vatRateId: l.vatRateId,
            })),
          }))}
          supplierOrders={supplierOrders.map((o) => ({
            id: o.id,
            code: o.code,
            supplierId: o.supplierId,
            supplierName: o.supplier.name,
            lines: o.lines.map((l) => ({
              description: `${l.articleSupplier.article.codeArticle} - ${l.articleSupplier.article.description}`,
              qty: l.qtyReceived > 0 ? l.qtyReceived : l.qtyOrdered,
              unitPriceHT: l.unitPriceHT,
              vatRateCode: l.vatRateCode,
            })),
          }))}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{invoices.length} facture(s)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Tiers</TableHead>
                <TableHead>Total HT</TableHead>
                <TableHead>Total TTC</TableHead>
                <TableHead>Paye</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => {
                const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-xs">{inv.code}</TableCell>
                    <TableCell>
                      <Badge variant={inv.type === "SALE" ? "default" : "secondary"}>
                        {inv.type === "SALE" ? "Vente" : "Achat"}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(inv.issueDate)}</TableCell>
                    <TableCell>{inv.customer?.name ?? inv.supplier?.name ?? "-"}</TableCell>
                    <TableCell>{formatEUR(inv.totalHT)}</TableCell>
                    <TableCell>{formatEUR(inv.totalTTC)}</TableCell>
                    <TableCell>{formatEUR(paid)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(inv.status)}>{inv.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/invoices/${inv.id}`}>Ouvrir</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function statusVariant(s: string): "default" | "secondary" | "destructive" | "outline" {
  if (s === "CANCELLED") return "destructive";
  if (s === "PAID") return "default";
  if (s === "DRAFT") return "secondary";
  return "outline";
}
