import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatNumber, formatDate } from "@/lib/utils";
import StockClient from "./client";

export const dynamic = "force-dynamic";

export default async function StockPage({ searchParams }: { searchParams: Promise<{ view?: string; q?: string }> }) {
  await requirePermission("stock.read");
  const sp = await searchParams;
  const view = sp.view || "units";
  const units = await prisma.stockUnit.findMany({
    where: sp.q
      ? {
          OR: [
            { codeUnique: { contains: sp.q } },
            { article: { codeArticle: { contains: sp.q } } },
            { article: { description: { contains: sp.q } } },
          ],
        }
      : undefined,
    include: { article: true, location: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  const locations = await prisma.location.findMany({ where: { deletedAt: null }, orderBy: { code: "asc" } });
  const articles = await prisma.article.findMany({ where: { deletedAt: null }, orderBy: { codeArticle: "asc" } });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Stock</h1>
        <StockClient
          mode="create"
          locations={locations.map((l) => ({ id: l.id, code: l.code, name: l.name }))}
          articles={articles.map((a) => ({ id: a.id, codeArticle: a.codeArticle, description: a.description }))}
        />
      </div>
      <div className="flex gap-2">
        <Button variant={view === "units" ? "default" : "outline"} size="sm" asChild>
          <Link href="/stock?view=units">Par unite</Link>
        </Button>
        <Button variant={view === "restes" ? "default" : "outline"} size="sm" asChild>
          <Link href="/stock?view=restes">Restes de bobines</Link>
        </Button>
      </div>
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>{units.length} unite(s) de stock</CardTitle>
          <form method="GET" className="flex gap-2">
            <input type="hidden" name="view" value={view} />
            <input
              name="q"
              placeholder="Recherche code / article..."
              defaultValue={sp.q || ""}
              className="h-9 rounded-md border px-2 text-sm w-64"
            />
            <Button size="sm" type="submit">Filtrer</Button>
          </form>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code unique</TableHead>
                <TableHead>Article</TableHead>
                <TableHead>Emplacement</TableHead>
                <TableHead>Qte</TableHead>
                <TableHead>Reserve</TableHead>
                <TableHead>Dispo</TableHead>
                <TableHead>Lot</TableHead>
                <TableHead>Etat</TableHead>
                <TableHead>Recu le</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {units
                .filter((u) => view !== "restes" || u.packagingState === "RESTE")
                .map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-mono text-xs">{u.codeUnique}</TableCell>
                    <TableCell>
                      <Link href={`/components/${u.articleId}`} className="hover:underline">
                        <span className="font-mono">{u.article.codeArticle}</span> - {u.article.description}
                      </Link>
                    </TableCell>
                    <TableCell>{u.location?.name ?? "-"}</TableCell>
                    <TableCell>{formatNumber(u.qtyOnHand, 0)}</TableCell>
                    <TableCell>{formatNumber(u.qtyReserved, 0)}</TableCell>
                    <TableCell>{formatNumber(u.qtyOnHand - u.qtyReserved, 0)}</TableCell>
                    <TableCell>{u.lotNumber ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{u.packagingState}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{formatDate(u.receivedAt)}</TableCell>
                    <TableCell>
                      <StockClient
                        mode="adjust"
                        stockUnit={{
                          id: u.id,
                          codeUnique: u.codeUnique,
                          articleName: u.article.description,
                          qtyOnHand: u.qtyOnHand,
                          locationId: u.locationId ?? "",
                        }}
                        locations={locations.map((l) => ({ id: l.id, code: l.code, name: l.name }))}
                        articles={articles.map((a) => ({ id: a.id, codeArticle: a.codeArticle, description: a.description }))}
                      />
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
