import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatEUR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SupplierOrdersPage() {
  await requirePermission("purchase.read");
  const orders = await prisma.supplierOrder.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      supplier: true,
      lines: { include: { articleSupplier: { include: { article: true } } } },
    },
  });
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Commandes fournisseur</h1>
        <Button asChild>
          <Link href="/orders/supplier/new">+ Nouvelle commande</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{orders.length} commande(s)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Lignes</TableHead>
                <TableHead>Total HT</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => {
                const total = o.lines.reduce((s, l) => s + l.qtyOrdered * l.unitPriceHT, 0);
                return (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono">{o.code}</TableCell>
                    <TableCell>{formatDate(o.orderDate)}</TableCell>
                    <TableCell>{o.supplier.name}</TableCell>
                    <TableCell>{o.lines.length}</TableCell>
                    <TableCell>{formatEUR(total)}</TableCell>
                    <TableCell>
                      <Badge variant={o.status === "RECEIVED" ? "success" : "secondary"}>{o.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/orders/supplier/${o.id}`}>Ouvrir</Link>
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
