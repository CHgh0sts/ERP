import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import NewCustomerOrderClient from "./client";

export const dynamic = "force-dynamic";

export default async function NewCustomerOrderPage() {
  await requirePermission("sales.write");
  const [customers, products, vatRates] = await Promise.all([
    prisma.customer.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
    prisma.product.findMany({ where: { deletedAt: null }, orderBy: { code: "asc" } }),
    prisma.vatRate.findMany({ orderBy: { rate: "desc" } }),
  ]);

  if (customers.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Nouveau devis</h1>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="mb-3">Aucun client enregistre.</p>
            <Link className="underline" href="/customers">
              Creer un client
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }
  if (products.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Nouveau devis</h1>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="mb-3">Aucun produit enregistre.</p>
            <Link className="underline" href="/products">
              Creer un produit
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }
  void redirect;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Nouveau devis / commande client</h1>
      <NewCustomerOrderClient
        customers={customers.map((c) => ({ id: c.id, name: c.name }))}
        products={products.map((p) => ({
          id: p.id,
          code: p.code,
          name: p.name,
          salePriceHT: p.salePriceHT ?? 0,
        }))}
        vatRates={vatRates.map((v) => ({ id: v.id, code: v.code, rate: v.rate, isDefault: v.isDefault }))}
      />
    </div>
  );
}
