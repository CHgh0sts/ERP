import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEUR, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AccountingPage() {
  await requirePermission("accounting.read");
  const [fy, journals, accountCount, recent] = await Promise.all([
    prisma.fiscalYear.findFirst({ orderBy: { startDate: "desc" } }),
    prisma.journal.findMany({ include: { _count: { select: { entries: true } } } }),
    prisma.account.count(),
    prisma.journalEntry.findMany({
      orderBy: { date: "desc" },
      take: 10,
      include: { journal: true, lines: true },
    }),
  ]);

  const totalDebit = recent.reduce((s, e) => s + e.lines.reduce((a, l) => a + l.debit, 0), 0);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Comptabilite</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader><CardTitle className="text-sm">Exercice en cours</CardTitle></CardHeader>
          <CardContent>
            {fy ? (
              <div className="text-sm">
                {fy.label}<br />
                {formatDate(fy.startDate)} - {formatDate(fy.endDate)}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">Aucun</span>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Comptes (PCG)</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{accountCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Journaux</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{journals.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Total debit (10 dern.)</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatEUR(totalDebit)}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Journaux</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr><th className="py-1">Code</th><th>Nom</th><th>Ecritures</th></tr>
            </thead>
            <tbody>
              {journals.map((j) => (
                <tr key={j.id} className="border-t">
                  <td className="py-1 font-mono">{j.code}</td>
                  <td><Link href={`/accounting/journals?code=${j.code}`} className="hover:underline">{j.name}</Link></td>
                  <td>{j._count.entries}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Dernieres ecritures</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr><th className="py-1">Date</th><th>Journal</th><th>Piece</th><th>Libelle</th><th>Debit</th></tr>
            </thead>
            <tbody>
              {recent.map((e) => {
                const d = e.lines.reduce((s, l) => s + l.debit, 0);
                return (
                  <tr key={e.id} className="border-t">
                    <td className="py-1">{formatDate(e.date)}</td>
                    <td className="font-mono text-xs">{e.journal.code}</td>
                    <td className="font-mono text-xs">{e.pieceRef ?? "-"}</td>
                    <td>{e.label ?? "-"}</td>
                    <td>{formatEUR(d)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
