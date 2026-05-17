import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ArticleClient from "./client";
import ImportCsvClient from "./import-client";
import { formatNumber } from "@/lib/utils";
import { hasPermission, getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function ComponentsPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string }> }) {
  await requirePermission("components.read");
  const user = await getCurrentUser();
  const canImport = hasPermission(user, "components.import");
  const sp = await searchParams;
  const where: {
    deletedAt: null;
    componentType?: string;
    OR?: Array<
      | { codeArticle: { contains: string } }
      | { mpn: { contains: string } }
      | { description: { contains: string } }
    >;
  } = { deletedAt: null };
  if (sp.type) where.componentType = sp.type;
  if (sp.q)
    where.OR = [
      { codeArticle: { contains: sp.q } },
      { mpn: { contains: sp.q } },
      { description: { contains: sp.q } },
    ];
  const articles = await prisma.article.findMany({
    where,
    orderBy: { codeArticle: "asc" },
    take: 500,
    include: { stockUnits: true, suppliers: { include: { supplier: true } } },
  });
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Composants CMS</h1>
        <div className="flex gap-2">
          {canImport && <ImportCsvClient />}
          <ArticleClient mode="create" />
        </div>
      </div>
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>{articles.length} article(s)</CardTitle>
          <form method="GET" className="flex gap-2">
            <input
              name="q"
              placeholder="Recherche code, MPN, description..."
              defaultValue={sp.q || ""}
              className="h-9 rounded-md border px-2 text-sm w-64"
            />
            <select name="type" defaultValue={sp.type || ""} className="h-9 rounded-md border px-2 text-sm">
              <option value="">Tous types</option>
              <option value="RESISTOR">Resistance</option>
              <option value="CAPACITOR">Condensateur</option>
              <option value="INDUCTOR">Inductance</option>
              <option value="IC">Circuit integre</option>
              <option value="TRANSISTOR">Transistor</option>
              <option value="DIODE">Diode</option>
              <option value="CONNECTOR">Connecteur</option>
              <option value="PCB">PCB</option>
              <option value="MECHANICAL">Mecanique</option>
              <option value="OTHER">Autre</option>
            </select>
            <Button size="sm" type="submit">Filtrer</Button>
          </form>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>MPN</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Dispo</TableHead>
                <TableHead>Fournisseurs</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {articles.map((a) => {
                const onHand = a.stockUnits.reduce((s, u) => s + u.qtyOnHand, 0);
                const reserved = a.stockUnits.reduce((s, u) => s + u.qtyReserved, 0);
                const available = onHand - reserved;
                const alerted = a.stockAlert > 0 && available < a.stockAlert;
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs">{a.codeArticle}</TableCell>
                    <TableCell>
                      <Link href={`/components/${a.id}`} className="hover:underline font-medium">
                        {a.description}
                      </Link>
                    </TableCell>
                    <TableCell>{a.componentType}</TableCell>
                    <TableCell>{a.format}</TableCell>
                    <TableCell>{a.mpn}</TableCell>
                    <TableCell>{formatNumber(onHand, 0)}</TableCell>
                    <TableCell>
                      <span className={alerted ? "text-destructive font-semibold" : ""}>
                        {formatNumber(available, 0)}
                      </span>
                      {alerted && (
                        <Badge variant="destructive" className="ml-2">
                          Alerte
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{a.suppliers.length}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/components/${a.id}`}>Ouvrir</Link>
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
