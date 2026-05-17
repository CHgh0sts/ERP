import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEUR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BalancePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requirePermission("accounting.read");
  const sp = await searchParams;

  const where: {
    entry: { isPosted: true; date?: { gte?: Date; lte?: Date } };
  } = { entry: { isPosted: true } };
  if (sp.from || sp.to) {
    where.entry.date = {};
    if (sp.from) where.entry.date.gte = new Date(sp.from);
    if (sp.to) where.entry.date.lte = new Date(sp.to);
  }

  const lines = await prisma.journalEntryLine.findMany({
    where,
    include: { account: true },
  });

  const byAccount = new Map<string, { number: string; label: string; debit: number; credit: number }>();
  for (const l of lines) {
    const k = l.account.id;
    const cur = byAccount.get(k) ?? { number: l.account.number, label: l.account.label, debit: 0, credit: 0 };
    cur.debit += l.debit;
    cur.credit += l.credit;
    byAccount.set(k, cur);
  }

  const rows = Array.from(byAccount.values()).sort((a, b) => a.number.localeCompare(b.number));
  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Balance</h1>
      <form className="flex gap-2 items-end text-sm" method="get">
        <div>
          <label className="block text-xs">Du</label>
          <input type="date" name="from" defaultValue={sp.from ?? ""} className="border rounded px-2 py-1" />
        </div>
        <div>
          <label className="block text-xs">Au</label>
          <input type="date" name="to" defaultValue={sp.to ?? ""} className="border rounded px-2 py-1" />
        </div>
        <button className="border rounded px-3 py-1 bg-primary text-primary-foreground">Afficher</button>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>{rows.length} compte(s) mouvemente(s)</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-1">Compte</th>
                <th>Libelle</th>
                <th>Debit</th>
                <th>Credit</th>
                <th>Solde debiteur</th>
                <th>Solde crediteur</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const sd = r.debit - r.credit;
                return (
                  <tr key={r.number} className="border-t">
                    <td className="py-1 font-mono">{r.number}</td>
                    <td>{r.label}</td>
                    <td>{formatEUR(r.debit)}</td>
                    <td>{formatEUR(r.credit)}</td>
                    <td>{sd > 0 ? formatEUR(sd) : ""}</td>
                    <td>{sd < 0 ? formatEUR(-sd) : ""}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t font-bold">
              <tr>
                <td colSpan={2} className="py-2 text-right">Totaux</td>
                <td>{formatEUR(totalDebit)}</td>
                <td>{formatEUR(totalCredit)}</td>
                <td colSpan={2}>Ecart : {formatEUR(totalDebit - totalCredit)}</td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
