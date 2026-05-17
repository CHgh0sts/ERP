import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import SupplierClient from "../client";
import { formatEUR, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SupplierPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("suppliers.read");
  const { id } = await params;
  const s = await prisma.supplier.findUnique({
    where: { id },
    include: {
      contacts: true,
      articles: { include: { article: true }, take: 30 },
      orders: { orderBy: { orderDate: "desc" }, take: 30 },
    },
  });
  if (!s || s.deletedAt) return notFound();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          {s.name} <span className="text-base font-normal text-muted-foreground">({s.code})</span>
        </h1>
        <SupplierClient
          mode="edit"
          supplier={{
            id: s.id,
            code: s.code,
            name: s.name,
            vatNumber: s.vatNumber ?? "",
            address: s.address ?? "",
            postalCode: s.postalCode ?? "",
            city: s.city ?? "",
            country: s.country,
            phone: s.phone ?? "",
            email: s.email ?? "",
            website: s.website ?? "",
            paymentTerms: s.paymentTerms ?? "",
            notes: s.notes ?? "",
            accountCode: s.accountCode ?? "",
          }}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Coordonnees</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <div>
              {s.address}
              <br />
              {s.postalCode} {s.city}
              <br />
              {s.country}
            </div>
            <div>Tel : {s.phone || "-"}</div>
            <div>Email : {s.email || "-"}</div>
            <div>Web : {s.website || "-"}</div>
            <div>TVA : {s.vatNumber || "-"}</div>
            <div>Compte : {s.accountCode || "-"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Contacts ({s.contacts.length})</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            {s.contacts.length === 0 && <p className="text-muted-foreground">Aucun contact</p>}
            {s.contacts.map((c) => (
              <div key={c.id}>
                <b>
                  {c.firstName} {c.lastName}
                </b>
                {c.role && <span className="text-muted-foreground"> - {c.role}</span>} <br />
                {c.email} / {c.phone}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Articles fournis ({s.articles.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code article</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Ref. fournisseur</TableHead>
                <TableHead>Prix HT</TableHead>
                <TableHead>MOQ</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {s.articles.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono">{a.article.codeArticle}</TableCell>
                  <TableCell>{a.article.description}</TableCell>
                  <TableCell>{a.supplierRef}</TableCell>
                  <TableCell>{formatEUR(a.priceHT)}</TableCell>
                  <TableCell>{a.moq}</TableCell>
                  <TableCell>
                    {a.isPreferred && <Badge variant="success">Prefere</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Commandes fournisseur ({s.orders.length})</CardTitle>
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
              {s.orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono">{o.code}</TableCell>
                  <TableCell>{formatDate(o.orderDate)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{o.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/orders/supplier/${o.id}`}>Voir</Link>
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
