import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatEUR, formatNumber, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tableau de bord - ERP" };

export default async function DashboardPage() {
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [
    nbArticles,
    nbStockUnits,
    nbOfOpen,
    nbCustomerOrders,
    nbSupplierOrders,
    stockAgg,
    lowStock,
    invoicesMonth,
    purchasesMonth,
    recentOrders,
    recentOfs,
    unpaid,
  ] = await Promise.all([
    prisma.article.count({ where: { deletedAt: null } }),
    prisma.stockUnit.count(),
    prisma.manufacturingOrder.count({ where: { status: { in: ["PLANNED", "RESERVED", "IN_PROGRESS"] } } }),
    prisma.customerOrder.count({ where: { status: { notIn: ["SHIPPED", "INVOICED", "CANCELLED"] } } }),
    prisma.supplierOrder.count({ where: { status: { in: ["DRAFT", "SENT", "PARTIAL"] } } }),
    prisma.stockUnit.aggregate({ _sum: { qtyOnHand: true } }),
    prisma.article.findMany({
      where: { deletedAt: null, stockAlert: { gt: 0 } },
      include: { stockUnits: true },
      take: 10,
    }),
    prisma.invoice.aggregate({
      _sum: { totalTTC: true },
      where: {
        type: "SALE",
        issueDate: { gte: startOfMonth },
        status: { not: "CANCELLED" },
      },
    }),
    prisma.invoice.aggregate({
      _sum: { totalTTC: true },
      where: {
        type: "PURCHASE",
        issueDate: { gte: startOfMonth },
        status: { not: "CANCELLED" },
      },
    }),
    prisma.customerOrder.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { customer: true },
    }),
    prisma.manufacturingOrder.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { product: true },
    }),
    prisma.invoice.findMany({
      where: { status: { in: ["ISSUED", "PARTIAL"] }, type: "SALE" },
      include: { customer: true, payments: true },
      orderBy: { dueDate: "asc" },
      take: 10,
    }),
  ]);

  const ruptures = lowStock
    .map((a) => {
      const qty = a.stockUnits.reduce((s, u) => s + (u.qtyOnHand - u.qtyReserved), 0);
      return { code: a.codeArticle, desc: a.description, qty, alert: a.stockAlert };
    })
    .filter((x) => x.qty < x.alert)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tableau de bord</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi title="Articles" value={nbArticles.toString()} />
        <Kpi title="Unites en stock" value={nbStockUnits.toString()} />
        <Kpi title="OF actifs" value={nbOfOpen.toString()} />
        <Kpi title="Stock total (qte)" value={formatNumber(stockAgg._sum.qtyOnHand ?? 0, 0)} />
        <Kpi title="Commandes client actives" value={nbCustomerOrders.toString()} />
        <Kpi title="Commandes fournisseur en cours" value={nbSupplierOrders.toString()} />
        <Kpi title="CA du mois" value={formatEUR(invoicesMonth._sum.totalTTC ?? 0)} />
        <Kpi title="Achats du mois" value={formatEUR(purchasesMonth._sum.totalTTC ?? 0)} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Alertes stock</CardTitle>
          </CardHeader>
          <CardContent>
            {ruptures.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune alerte en cours</p>
            ) : (
              <ul className="text-sm space-y-1">
                {ruptures.map((r) => (
                  <li key={r.code} className="flex justify-between border-b py-1">
                    <span>
                      <span className="font-mono">{r.code}</span> - {r.desc}
                    </span>
                    <span className="text-destructive font-medium">
                      {formatNumber(r.qty, 0)} / seuil {formatNumber(r.alert, 0)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Factures a encaisser</CardTitle>
          </CardHeader>
          <CardContent>
            {unpaid.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune facture en attente</p>
            ) : (
              <ul className="text-sm space-y-1">
                {unpaid.map((inv) => {
                  const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
                  const remaining = inv.totalTTC - paid;
                  const overdue = inv.dueDate && inv.dueDate < new Date();
                  return (
                    <li key={inv.id} className="flex justify-between border-b py-1">
                      <span>
                        <Link href={`/invoices/${inv.id}`} className="font-mono hover:underline">
                          {inv.code}
                        </Link>{" "}
                        - {inv.customer?.name ?? "-"}
                        {overdue && <Badge variant="destructive" className="ml-2">En retard</Badge>}
                      </span>
                      <span>{formatEUR(remaining)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dernieres commandes client</CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune commande</p>
            ) : (
              <ul className="text-sm space-y-1">
                {recentOrders.map((o) => (
                  <li key={o.id} className="flex justify-between border-b py-1">
                    <Link href={`/orders/customer/${o.id}`} className="hover:underline">
                      <span className="font-mono">{o.code}</span> - {o.customer.name}
                    </Link>
                    <span className="text-muted-foreground text-xs">
                      {formatDate(o.orderDate)} - <Badge variant="secondary">{o.status}</Badge>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Derniers OF</CardTitle>
          </CardHeader>
          <CardContent>
            {recentOfs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun OF</p>
            ) : (
              <ul className="text-sm space-y-1">
                {recentOfs.map((of) => (
                  <li key={of.id} className="flex justify-between border-b py-1">
                    <Link href={`/manufacturing/${of.id}`} className="hover:underline">
                      <span className="font-mono">{of.code}</span> - {of.product.name}
                    </Link>
                    <span className="text-muted-foreground text-xs">
                      qte {of.qty} - <Badge variant="secondary">{of.status}</Badge>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
