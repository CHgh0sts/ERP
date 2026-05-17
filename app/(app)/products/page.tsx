import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatEUR } from "@/lib/utils";
import ProductClient from "./client";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  await requirePermission("products.read");
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    orderBy: { code: "asc" },
    include: {
      boms: { where: { isActive: true }, include: { _count: { select: { lines: true } } } },
      _count: { select: { boms: true, manufacturingOrders: true } },
    },
  });
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Produits & BOM</h1>
        <ProductClient mode="create" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{products.length} produit(s)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Prix HT</TableHead>
                <TableHead>BOM actif</TableHead>
                <TableHead>Versions</TableHead>
                <TableHead>OF</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.code}</TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/products/${p.id}`} className="hover:underline">
                      {p.name}
                    </Link>
                  </TableCell>
                  <TableCell>{p.salePriceHT != null ? formatEUR(p.salePriceHT) : "-"}</TableCell>
                  <TableCell>
                    {p.boms[0] ? (
                      <Badge>v{p.boms[0].version} ({p.boms[0]._count.lines} lignes)</Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">Aucun</span>
                    )}
                  </TableCell>
                  <TableCell>{p._count.boms}</TableCell>
                  <TableCell>{p._count.manufacturingOrders}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/products/${p.id}`}>Ouvrir</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
