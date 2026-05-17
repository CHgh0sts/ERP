import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import NewOrderClient from "./client";

export const dynamic = "force-dynamic";

export default async function NewSupplierOrderPage() {
  await requirePermission("purchase.write");
  const suppliers = await prisma.supplier.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    include: {
      articles: {
        include: { article: true },
      },
    },
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Nouvelle commande fournisseur</h1>
      <NewOrderClient
        suppliers={suppliers.map((s) => ({
          id: s.id,
          name: s.name,
          articles: s.articles.map((a) => ({
            id: a.id,
            priceHT: a.priceHT,
            moq: a.moq,
            codeArticle: a.article.codeArticle,
            description: a.article.description,
          })),
        }))}
      />
    </div>
  );
}
