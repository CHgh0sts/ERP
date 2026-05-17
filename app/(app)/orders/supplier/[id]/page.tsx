import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatEUR, formatNumber } from "@/lib/utils";
import OrderClient from "./client";

export const dynamic = "force-dynamic";

export default async function SupplierOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("purchase.read");
  const { id } = await params;
  const order = await prisma.supplierOrder.findUnique({
    where: { id },
    include: {
      supplier: true,
      lines: { include: { articleSupplier: { include: { article: true } } } },
      receptions: { include: { lines: true } },
    },
  });
  if (!order) return notFound();
  const locations = await prisma.location.findMany({ where: { deletedAt: null }, orderBy: { code: "asc" } });
  const totalHT = order.lines.reduce((s, l) => s + l.qtyOrdered * l.unitPriceHT, 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          Commande <span className="font-mono">{order.code}</span>
        </h1>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <a href={`/api/orders/supplier/${order.id}/pdf`} target="_blank">
              PDF
            </a>
          </Button>
          <OrderClient
            order={{ id: order.id, code: order.code, status: order.status }}
            lines={order.lines.map((l) => ({
              id: l.id,
              codeArticle: l.articleSupplier.article.codeArticle,
              description: l.articleSupplier.article.description,
              qtyOrdered: l.qtyOrdered,
              qtyReceived: l.qtyReceived,
              unitPriceHT: l.unitPriceHT,
            }))}
            locations={locations.map((l) => ({ id: l.id, code: l.code, name: l.name }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <InfoCard title="Fournisseur" value={order.supplier.name} />
        <InfoCard title="Date" value={formatDate(order.orderDate)} />
        <InfoCard title="Statut" value={order.status} />
        <InfoCard title="Total HT" value={formatEUR(totalHT)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lignes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Article</TableHead>
                <TableHead>Qte commandee</TableHead>
                <TableHead>Qte recue</TableHead>
                <TableHead>Prix HT</TableHead>
                <TableHead>TVA</TableHead>
                <TableHead>Total HT</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.lines.map((l) => {
                const done = l.qtyReceived >= l.qtyOrdered;
                return (
                  <TableRow key={l.id}>
                    <TableCell>
                      <Link href={`/components/${l.articleSupplier.articleId}`} className="hover:underline">
                        <span className="font-mono">{l.articleSupplier.article.codeArticle}</span> -{" "}
                        {l.articleSupplier.article.description}
                      </Link>
                    </TableCell>
                    <TableCell>{formatNumber(l.qtyOrdered, 2)}</TableCell>
                    <TableCell>{formatNumber(l.qtyReceived, 2)}</TableCell>
                    <TableCell>{formatEUR(l.unitPriceHT)}</TableCell>
                    <TableCell>{l.vatRateCode}</TableCell>
                    <TableCell>{formatEUR(l.qtyOrdered * l.unitPriceHT)}</TableCell>
                    <TableCell>
                      <Badge variant={done ? "success" : "secondary"}>
                        {done ? "Recue" : l.qtyReceived > 0 ? "Partielle" : "En attente"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Receptions ({order.receptions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {order.receptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune reception enregistree</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {order.receptions.map((r) => (
                <li key={r.id} className="border-b py-2">
                  <div className="font-medium">{formatDate(r.receivedAt)}</div>
                  <div className="text-muted-foreground text-xs">{r.lines.length} ligne(s) recue(s)</div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs uppercase text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}
