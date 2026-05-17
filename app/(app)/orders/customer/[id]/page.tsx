import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatEUR, formatDate } from "@/lib/utils";
import CustomerOrderDetailClient from "./client";

export const dynamic = "force-dynamic";

export default async function CustomerOrderPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("sales.read");
  const { id } = await params;
  const order = await prisma.customerOrder.findUnique({
    where: { id },
    include: {
      customer: true,
      lines: {
        include: {
          product: { include: { boms: { where: { isActive: true } } } },
          vatRate: true,
        },
      },
      manufacturingOrders: { include: { bom: true, product: true } },
      invoices: true,
    },
  });
  if (!order) notFound();

  const totalHT = order.lines.reduce((s, l) => s + l.qty * l.unitPriceHT, 0);
  const totalVat = order.lines.reduce((s, l) => s + l.qty * l.unitPriceHT * ((l.vatRate?.rate ?? 0) / 100), 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">
            Commande <span className="font-mono">{order.code}</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Client : <Link href={`/customers/${order.customerId}`} className="hover:underline">{order.customer.name}</Link>
            &nbsp;- Cree le {formatDate(order.orderDate)}
            {order.dueDate && " - Echeance " + formatDate(order.dueDate)}
          </p>
        </div>
        <Badge variant={order.status === "CANCELLED" ? "destructive" : "default"}>{order.status}</Badge>
      </div>

      <CustomerOrderDetailClient
        orderId={order.id}
        status={order.status}
        hasActiveBoms={order.lines.every((l) => l.product.boms.length > 0)}
      />

      <Card>
        <CardHeader>
          <CardTitle>Lignes</CardTitle>
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
              </tr>
            </thead>
            <tbody>
              {order.lines.map((l) => (
                <tr key={l.id} className="border-t">
                  <td className="py-1">
                    <Link href={`/products/${l.productId}`} className="hover:underline font-mono text-xs">
                      {l.product.code}
                    </Link>{" "}
                    <span>{l.product.name}</span>
                  </td>
                  <td>{l.description || "-"}</td>
                  <td>{l.qty}</td>
                  <td>{formatEUR(l.unitPriceHT)}</td>
                  <td>{l.vatRate?.code ?? "-"}</td>
                  <td>{formatEUR(l.qty * l.unitPriceHT)}</td>
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

      <Card>
        <CardHeader>
          <CardTitle>Ordres de fabrication lies</CardTitle>
        </CardHeader>
        <CardContent>
          {order.manufacturingOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun OF pour cette commande</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {order.manufacturingOrders.map((of) => (
                <li key={of.id}>
                  <Link href={`/manufacturing/${of.id}`} className="hover:underline font-mono">
                    {of.code}
                  </Link>{" "}
                  - {of.product.name} (BOM v{of.bom.version}) - qte {of.qty} -{" "}
                  <Badge variant="secondary">{of.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {order.invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Factures</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {order.invoices.map((inv) => (
                <li key={inv.id}>
                  <Link href={`/invoices/${inv.id}`} className="hover:underline font-mono">
                    {inv.code}
                  </Link>{" "}
                  - {formatEUR(inv.totalTTC)} TTC - <Badge variant="secondary">{inv.status}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {order.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{order.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
