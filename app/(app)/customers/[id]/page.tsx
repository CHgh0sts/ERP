import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import CustomerClient from "../client";

export const dynamic = "force-dynamic";

export default async function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("customers.read");
  const { id } = await params;
  const c = await prisma.customer.findUnique({
    where: { id },
    include: {
      contacts: true,
      orders: { orderBy: { orderDate: "desc" }, take: 30 },
      invoices: { orderBy: { issueDate: "desc" }, take: 10 },
    },
  });
  if (!c || c.deletedAt) return notFound();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          {c.name} <span className="text-base font-normal text-muted-foreground">({c.code})</span>
        </h1>
        <CustomerClient
          mode="edit"
          customer={{
            id: c.id,
            code: c.code,
            name: c.name,
            vatNumber: c.vatNumber ?? "",
            address: c.address ?? "",
            postalCode: c.postalCode ?? "",
            city: c.city ?? "",
            country: c.country,
            phone: c.phone ?? "",
            email: c.email ?? "",
            website: c.website ?? "",
            paymentTerms: c.paymentTerms ?? "",
            notes: c.notes ?? "",
            accountCode: c.accountCode ?? "",
          }}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coordonnees</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <div>
            {c.address}
            <br />
            {c.postalCode} {c.city}
            <br />
            {c.country}
          </div>
          <div>Tel : {c.phone || "-"}</div>
          <div>Email : {c.email || "-"}</div>
          <div>Compte comptable : {c.accountCode || "-"}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Commandes ({c.orders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {c.orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono">{o.code}</TableCell>
                  <TableCell>{formatDate(o.orderDate)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{o.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/orders/customer/${o.id}`}>Voir</Link>
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
