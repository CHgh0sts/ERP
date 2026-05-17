import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDateTime } from "@/lib/utils";
import OfClient from "./client";

export const dynamic = "force-dynamic";

export default async function ManufacturingOrderPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("of.read");
  const { id } = await params;
  const of = await prisma.manufacturingOrder.findUnique({
    where: { id },
    include: {
      product: true,
      bom: { include: { lines: { include: { article: true } } } },
      customerOrder: { include: { customer: true } },
      reservations: { include: { article: true } },
      consumptions: { include: { stockUnit: { include: { article: true, location: true } } } },
    },
  });
  if (!of) notFound();

  const stockUnitsByArticle = await prisma.stockUnit.findMany({
    where: {
      articleId: { in: of.reservations.map((r) => r.articleId) },
      qtyOnHand: { gt: 0 },
    },
    include: { article: true, location: true },
    orderBy: [{ articleId: "asc" }, { receivedAt: "asc" }],
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">
            OF <span className="font-mono">{of.code}</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            {of.product.name} (BOM v{of.bom.version}) - Qte {of.qty}
            {of.customerOrder && (
              <>
                &nbsp;- Commande&nbsp;
                <Link href={`/orders/customer/${of.customerOrderId}`} className="hover:underline">
                  {of.customerOrder.code}
                </Link>{" "}
                ({of.customerOrder.customer.name})
              </>
            )}
          </p>
        </div>
        <Badge variant={of.status === "CANCELLED" ? "destructive" : "default"}>{of.status}</Badge>
      </div>

      <OfClient
        ofId={of.id}
        status={of.status}
        reservations={of.reservations.map((r) => ({
          articleId: r.articleId,
          codeArticle: r.article.codeArticle,
          description: r.article.description,
          qtyNeeded: r.qtyNeeded,
          qtyReserved: r.qtyReserved,
          qtyConsumed: r.qtyConsumed,
        }))}
        stockUnits={stockUnitsByArticle.map((u) => ({
          id: u.id,
          articleId: u.articleId,
          codeUnique: u.codeUnique,
          articleCode: u.article.codeArticle,
          qtyOnHand: u.qtyOnHand,
          qtyReserved: u.qtyReserved,
          lotNumber: u.lotNumber,
          location: u.location?.name ?? null,
        }))}
      />

      <Card>
        <CardHeader>
          <CardTitle>Consommations</CardTitle>
        </CardHeader>
        <CardContent>
          {of.consumptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune consommation enregistree</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-1">Quand</th>
                  <th>Article</th>
                  <th>Unite</th>
                  <th>Emplacement</th>
                  <th>Qte</th>
                </tr>
              </thead>
              <tbody>
                {of.consumptions.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="py-1">{formatDateTime(c.at)}</td>
                    <td className="font-mono text-xs">{c.stockUnit.article.codeArticle}</td>
                    <td className="font-mono text-xs">{c.stockUnit.codeUnique}</td>
                    <td>{c.stockUnit.location?.name ?? "-"}</td>
                    <td>{c.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {of.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{of.notes}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Planification</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <div>Debut prevu : {of.plannedStart ? formatDate(of.plannedStart) : "-"}</div>
          <div>Fin prevue : {of.plannedEnd ? formatDate(of.plannedEnd) : "-"}</div>
          <div>Debut reel : {of.startedAt ? formatDateTime(of.startedAt) : "-"}</div>
          <div>Fin reelle : {of.completedAt ? formatDateTime(of.completedAt) : "-"}</div>
        </CardContent>
      </Card>
    </div>
  );
}
