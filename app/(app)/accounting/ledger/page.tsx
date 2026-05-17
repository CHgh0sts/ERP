import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEUR, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string; from?: string; to?: string }>;
}) {
  await requirePermission("accounting.read");
  const sp = await searchParams;

  const accounts = await prisma.account.findMany({ orderBy: { number: "asc" } });
  const accountNumber = sp.account || accounts[0]?.number;
  const account = accountNumber ? accounts.find((a) => a.number === accountNumber) : null;

  let lines: Awaited<ReturnType<typeof loadLines>> = [];
  if (account) {
    lines = await loadLines(account.id, sp.from, sp.to);
  }

  let running = 0;
  const rows = lines.map((l) => {
    running += l.debit - l.credit;
    return { ...l, solde: running };
  });

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Grand livre</h1>
      <form className="flex gap-2 items-end text-sm" method="get">
        <div>
          <label className="block text-xs">Compte</label>
          <select name="account" defaultValue={accountNumber ?? ""} className="border rounded px-2 py-1 min-w-[300px]">
            {accounts.map((a) => (
              <option key={a.id} value={a.number}>
                {a.number} - {a.label}
              </option>
            ))}
          </select>
        </div>
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

      {account && (
        <Card>
          <CardHeader>
            <CardTitle>
              {account.number} - {account.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-1">Date</th>
                  <th>Journal</th>
                  <th>Piece</th>
                  <th>Libelle</th>
                  <th>Debit</th>
                  <th>Credit</th>
                  <th>Solde</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="py-1">{formatDate(r.date)}</td>
                    <td className="font-mono text-xs">{r.journalCode}</td>
                    <td className="font-mono text-xs">{r.pieceRef ?? "-"}</td>
                    <td>{r.label ?? "-"}</td>
                    <td>{r.debit > 0 ? formatEUR(r.debit) : ""}</td>
                    <td>{r.credit > 0 ? formatEUR(r.credit) : ""}</td>
                    <td className={r.solde < 0 ? "text-destructive" : ""}>{formatEUR(r.solde)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t font-bold">
                <tr>
                  <td colSpan={4} className="py-2 text-right">Totaux</td>
                  <td>{formatEUR(totalDebit)}</td>
                  <td>{formatEUR(totalCredit)}</td>
                  <td>{formatEUR(totalDebit - totalCredit)}</td>
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

async function loadLines(accountId: string, from?: string, to?: string) {
  const where: {
    accountId: string;
    entry?: { date?: { gte?: Date; lte?: Date }; isPosted: true };
  } = { accountId };
  where.entry = { isPosted: true };
  if (from || to) {
    where.entry.date = {};
    if (from) where.entry.date.gte = new Date(from);
    if (to) where.entry.date.lte = new Date(to);
  }
  const items = await prisma.journalEntryLine.findMany({
    where,
    include: { entry: { include: { journal: true } } },
    orderBy: { entry: { date: "asc" } },
  });
  return items.map((l) => ({
    id: l.id,
    date: l.entry.date,
    journalCode: l.entry.journal.code,
    pieceRef: l.entry.pieceRef,
    label: l.label ?? l.entry.label,
    debit: l.debit,
    credit: l.credit,
  }));
}
