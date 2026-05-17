import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import NewInvoiceClient from "./client";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; customerOrderId?: string; supplierOrderId?: string }>;
}) {
  await requirePermission("invoices.write");
  const sp = await searchParams;
  const type = sp.type === "PURCHASE" ? "PURCHASE" : "SALE";

  const [customers, suppliers, vatRates, customerOrders, supplierOrders] = await Promise.all([
    prisma.customer.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
    prisma.supplier.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
    prisma.vatRate.findMany({ orderBy: { rate: "desc" } }),
    prisma.customerOrder.findMany({
      where: { status: { notIn: ["CANCELLED", "INVOICED"] } },
      include: { customer: true, lines: { include: { product: true, vatRate: true } } },
      orderBy: { orderDate: "desc" },
    }),
    prisma.supplierOrder.findMany({
      where: { status: { notIn: ["CANCELLED", "DRAFT"] } },
      include: {
        supplier: true,
        lines: { include: { articleSupplier: { include: { article: true } } } },
      },
      orderBy: { orderDate: "desc" },
    }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">
        Nouvelle facture {type === "SALE" ? "de vente" : "d'achat"}
      </h1>
      <NewInvoiceClient
        type={type}
        prefillCustomerOrderId={sp.customerOrderId ?? null}
        prefillSupplierOrderId={sp.supplierOrderId ?? null}
        customers={customers.map((c) => ({ id: c.id, name: c.name }))}
        suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
        vatRates={vatRates.map((v) => ({ id: v.id, code: v.code, rate: v.rate, isDefault: v.isDefault }))}
        customerOrders={customerOrders.map((o) => ({
          id: o.id,
          code: o.code,
          customerId: o.customerId,
          customerName: o.customer.name,
          lines: o.lines.map((l) => ({
            description: `${l.product.code} - ${l.product.name}${l.description ? " - " + l.description : ""}`,
            qty: l.qty,
            unitPriceHT: l.unitPriceHT,
            vatRateId: l.vatRateId,
          })),
        }))}
        supplierOrders={supplierOrders.map((o) => ({
          id: o.id,
          code: o.code,
          supplierId: o.supplierId,
          supplierName: o.supplier.name,
          lines: o.lines.map((l) => ({
            description: `${l.articleSupplier.article.codeArticle} - ${l.articleSupplier.article.description}`,
            qty: l.qtyReceived > 0 ? l.qtyReceived : l.qtyOrdered,
            unitPriceHT: l.unitPriceHT,
            vatRateCode: l.vatRateCode,
          })),
        }))}
      />
    </div>
  );
}
