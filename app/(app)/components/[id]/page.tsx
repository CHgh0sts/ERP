import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { articleStockSummary } from "@/lib/stock";
import { formatEUR, formatNumber } from "@/lib/utils";
import ArticleClient from "../client";
import ArticleDetailClient from "./detail-client";

export const dynamic = "force-dynamic";

export default async function ArticleDetail({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("components.read");
  const { id } = await params;
  const a = await prisma.article.findUnique({
    where: { id },
    include: {
      datasheet: true,
      suppliers: { include: { supplier: true } },
      equivalencesA: { include: { articleB: true } },
      equivalencesB: { include: { articleA: true } },
      stockUnits: { include: { location: true } },
    },
  });
  if (!a || a.deletedAt) return notFound();
  const stock = await articleStockSummary(a.id);
  const suppliers = await prisma.supplier.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
  });
  const otherArticles = await prisma.article.findMany({
    where: { deletedAt: null, NOT: { id: a.id } },
    orderBy: { codeArticle: "asc" },
    take: 500,
  });
  const eqs = [
    ...a.equivalencesA.map((e) => ({ id: e.id, other: e.articleB, note: e.note })),
    ...a.equivalencesB.map((e) => ({ id: e.id, other: e.articleA, note: e.note })),
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          <span className="font-mono">{a.codeArticle}</span> - {a.description}
        </h1>
        <ArticleClient
          mode="edit"
          article={{
            id: a.id,
            codeArticle: a.codeArticle,
            mpn: a.mpn ?? "",
            description: a.description,
            componentType: a.componentType,
            format: a.format ?? "",
            value: a.value ?? "",
            stockAlert: a.stockAlert,
            lastPurchasePrice: a.lastPurchasePrice,
            notes: a.notes ?? "",
          }}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground">Stock physique</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stock.onHand, 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground">Reserve</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stock.reserved, 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground">Disponible</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                a.stockAlert > 0 && stock.available < a.stockAlert ? "text-destructive" : ""
              }`}
            >
              {formatNumber(stock.available, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground">Seuil alerte</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(a.stockAlert, 0)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Caracteristiques</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <div>Type : {a.componentType}</div>
            <div>Format : {a.format ?? "-"}</div>
            <div>Valeur : {a.value ?? "-"}</div>
            <div>MPN : {a.mpn ?? "-"}</div>
            <div>Dernier prix achat : {a.lastPurchasePrice ? formatEUR(a.lastPurchasePrice) : "-"}</div>
            <div>Notes : {a.notes ?? "-"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Datasheet</CardTitle>
          </CardHeader>
          <CardContent>
            <ArticleDetailClient
              articleId={a.id}
              hasDatasheet={!!a.datasheet}
              datasheetFileId={a.datasheet?.id ?? null}
              datasheetName={a.datasheet?.originalName ?? null}
              suppliers={suppliers.map((s) => ({ id: s.id, name: s.name, code: s.code }))}
              articles={otherArticles.map((x) => ({ id: x.id, codeArticle: x.codeArticle, description: x.description }))}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fournisseurs ({a.suppliers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Ref. fourn.</TableHead>
                <TableHead>Prix HT</TableHead>
                <TableHead>MOQ</TableHead>
                <TableHead>Conditionnement</TableHead>
                <TableHead>Lead time</TableHead>
                <TableHead>Prefere</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {a.suppliers.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <Link href={`/suppliers/${s.supplierId}`} className="hover:underline">
                      {s.supplier.name}
                    </Link>
                  </TableCell>
                  <TableCell>{s.supplierRef ?? "-"}</TableCell>
                  <TableCell>{formatEUR(s.priceHT)}</TableCell>
                  <TableCell>{s.moq}</TableCell>
                  <TableCell>{s.packaging ?? "-"}</TableCell>
                  <TableCell>{s.leadTimeDays} j</TableCell>
                  <TableCell>{s.isPreferred && <Badge variant="success">Oui</Badge>}</TableCell>
                  <TableCell>
                    <ArticleDetailClient.DeleteSupplierButton asId={s.id} articleId={a.id} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Equivalences ({eqs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {eqs.length === 0 && <p className="text-sm text-muted-foreground">Aucune equivalence</p>}
          <ul className="space-y-1 text-sm">
            {eqs.map((e) => (
              <li key={e.id} className="flex justify-between border-b py-1">
                <div>
                  <Link href={`/components/${e.other.id}`} className="hover:underline font-mono">
                    {e.other.codeArticle}
                  </Link>
                  <span className="ml-2">{e.other.description}</span>
                  {e.note && <span className="text-muted-foreground ml-2 italic">- {e.note}</span>}
                </div>
                <ArticleDetailClient.DeleteEquivButton eqId={e.id} articleId={a.id} />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Unites en stock ({a.stockUnits.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code unique</TableHead>
                <TableHead>Emplacement</TableHead>
                <TableHead>Qte</TableHead>
                <TableHead>Reserve</TableHead>
                <TableHead>Lot</TableHead>
                <TableHead>Conditionnement</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {a.stockUnits.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-mono text-xs">{u.codeUnique}</TableCell>
                  <TableCell>{u.location?.name ?? "-"}</TableCell>
                  <TableCell>{formatNumber(u.qtyOnHand, 0)}</TableCell>
                  <TableCell>{formatNumber(u.qtyReserved, 0)}</TableCell>
                  <TableCell>{u.lotNumber ?? "-"}</TableCell>
                  <TableCell>{u.packagingState}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" asChild>
                      <a href={`/api/qrcode/${u.id}`} target="_blank">QR</a>
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
