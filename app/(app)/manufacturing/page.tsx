import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ManufacturingPage() {
  await requirePermission("of.read");
  const ofs = await prisma.manufacturingOrder.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      product: true,
      bom: true,
      customerOrder: { include: { customer: true } },
      reservations: true,
    },
  });
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Ordres de fabrication</h1>
        <Button asChild>
          <Link href="/manufacturing/new">+ Nouvel OF</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{ofs.length} ordre(s) de fabrication</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Produit</TableHead>
                <TableHead>BOM</TableHead>
                <TableHead>Qte</TableHead>
                <TableHead>Reservation</TableHead>
                <TableHead>Commande</TableHead>
                <TableHead>Cree le</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ofs.map((of) => {
                const totalNeed = of.reservations.reduce((s, r) => s + r.qtyNeeded, 0);
                const totalReserved = of.reservations.reduce((s, r) => s + r.qtyReserved, 0);
                const pct = totalNeed > 0 ? Math.round((totalReserved / totalNeed) * 100) : 0;
                return (
                  <TableRow key={of.id}>
                    <TableCell className="font-mono text-xs">{of.code}</TableCell>
                    <TableCell>{of.product.name}</TableCell>
                    <TableCell>v{of.bom.version}</TableCell>
                    <TableCell>{of.qty}</TableCell>
                    <TableCell>{pct}%</TableCell>
                    <TableCell>
                      {of.customerOrder ? (
                        <Link href={`/orders/customer/${of.customerOrderId}`} className="hover:underline text-xs">
                          {of.customerOrder.code}
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(of.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(of.status)}>{of.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/manufacturing/${of.id}`}>Ouvrir</Link>
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
  if (s === "DONE") return "default";
  if (s === "IN_PROGRESS") return "default";
  return "secondary";
}
