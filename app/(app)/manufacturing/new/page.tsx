import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import NewOfClient from "./client";

export const dynamic = "force-dynamic";

export default async function NewManufacturingOrderPage() {
  await requirePermission("of.create");
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    include: { boms: { orderBy: { createdAt: "desc" } } },
    orderBy: { code: "asc" },
  });

  const eligible = products.filter((p) => p.boms.length > 0);
  if (eligible.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Nouvel OF</h1>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="mb-3">Aucun produit avec BOM. Creez d&apos;abord une BOM.</p>
            <Link className="underline" href="/products">
              Produits
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Nouvel ordre de fabrication</h1>
      <NewOfClient
        products={eligible.map((p) => ({
          id: p.id,
          code: p.code,
          name: p.name,
          boms: p.boms.map((b) => ({ id: b.id, version: b.version, isActive: b.isActive })),
        }))}
      />
    </div>
  );
}
