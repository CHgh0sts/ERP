import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatEUR, formatDate } from "@/lib/utils";
import ProductClient from "../client";
import BomClient from "./bom-client";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("products.read");
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      boms: {
        orderBy: { createdAt: "desc" },
        include: {
          lines: { include: { article: true } },
          _count: { select: { manufacturingOrders: true } },
        },
      },
      manufacturingOrders: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { bom: true },
      },
    },
  });
  if (!product || product.deletedAt) notFound();

  const articles = await prisma.article.findMany({
    where: { deletedAt: null },
    select: { id: true, codeArticle: true, description: true },
    orderBy: { codeArticle: "asc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">
            <span className="font-mono text-lg text-muted-foreground mr-2">{product.code}</span>
            {product.name}
          </h1>
          {product.description && <p className="text-sm text-muted-foreground">{product.description}</p>}
        </div>
        <ProductClient
          mode="edit"
          product={{
            id: product.id,
            code: product.code,
            name: product.name,
            description: product.description,
            salePriceHT: product.salePriceHT,
          }}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Nomenclatures (BOM)</CardTitle>
          <BomClient mode="create" productId={product.id} articles={articles} />
        </CardHeader>
        <CardContent className="space-y-3">
          {product.boms.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucune BOM. Creez une premiere version.</p>
          )}
          {product.boms.map((b) => (
            <div key={b.id} className="border rounded-md p-3">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant={b.isActive ? "default" : "secondary"}>Version {b.version}</Badge>
                  {b.isActive && <Badge variant="default">Actif</Badge>}
                  <span className="text-xs text-muted-foreground">{formatDate(b.createdAt)}</span>
                </div>
                <BomClient
                  mode="edit"
                  productId={product.id}
                  articles={articles}
                  bom={{
                    id: b.id,
                    version: b.version,
                    isActive: b.isActive,
                    lines: b.lines.map((l) => ({
                      articleId: l.articleId,
                      qtyPerUnit: l.qtyPerUnit,
                      reference: l.reference ?? "",
                      notes: l.notes ?? "",
                    })),
                  }}
                />
              </div>
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-1">Ref PCB</th>
                    <th>Article</th>
                    <th>Designation</th>
                    <th>Qte / unite</th>
                  </tr>
                </thead>
                <tbody>
                  {b.lines.map((l) => (
                    <tr key={l.id} className="border-t">
                      <td className="py-1 font-mono text-xs">{l.reference || "-"}</td>
                      <td className="font-mono text-xs">{l.article.codeArticle}</td>
                      <td>{l.article.description}</td>
                      <td>{l.qtyPerUnit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Derniers ordres de fabrication</CardTitle>
        </CardHeader>
        <CardContent>
          {product.manufacturingOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun OF</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-1">Code</th>
                  <th>BOM</th>
                  <th>Qte</th>
                  <th>Statut</th>
                  <th>Cree le</th>
                </tr>
              </thead>
              <tbody>
                {product.manufacturingOrders.map((of) => (
                  <tr key={of.id} className="border-t">
                    <td className="py-1 font-mono text-xs">
                      <Link href={`/manufacturing/${of.id}`} className="hover:underline">
                        {of.code}
                      </Link>
                    </td>
                    <td>v{of.bom.version}</td>
                    <td>{of.qty}</td>
                    <td><Badge variant="secondary">{of.status}</Badge></td>
                    <td>{formatDate(of.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {product.salePriceHT != null && (
            <p className="text-xs text-muted-foreground mt-3">Prix de vente HT : {formatEUR(product.salePriceHT)}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
