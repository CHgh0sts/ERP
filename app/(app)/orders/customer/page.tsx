import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatEUR, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CustomerOrdersPage() {
  await requirePermission("sales.read");
  const orders = await prisma.customerOrder.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      customer: true,
      lines: { include: { vatRate: true } },
      _count: { select: { lines: true, manufacturingOrders: true, invoices: true } },
    },
  });
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Commandes client</h1>
        <Button asChild>
          <Link href="/orders/customer/new">+ Nouveau devis</Link>
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
                <TableHead>Client</TableHead>
                <TableHead>Lignes</TableHead>
                <TableHead>Total HT</TableHead>
                <TableHead>OF</TableHead>
                <TableHead>Fact.</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => {
                const totalHT = o.lines.reduce((s, l) => s + l.qty * l.unitPriceHT, 0);
                return (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.code}</TableCell>
                    <TableCell>{formatDate(o.orderDate)}</TableCell>
                    <TableCell>{o.customer.name}</TableCell>
                    <TableCell>{o._count.lines}</TableCell>
                    <TableCell>{formatEUR(totalHT)}</TableCell>
                    <TableCell>{o._count.manufacturingOrders}</TableCell>
                    <TableCell>{o._count.invoices}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(o.status)}>{statusLabel(o.status)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/orders/customer/${o.id}`}>Ouvrir</Link>
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

function statusLabel(s: string): string {
  return (
    {
      QUOTE: "Devis",
      CONFIRMED: "Confirmee",
      IN_PRODUCTION: "En prod",
      READY: "Prete",
      SHIPPED: "Expediee",
      INVOICED: "Facturee",
      CANCELLED: "Annulee",
    }[s] ?? s
  );
}

function statusVariant(s: string): "default" | "secondary" | "destructive" | "outline" {
  if (s === "CANCELLED") return "destructive";
  if (s === "QUOTE") return "secondary";
  return "default";
}
