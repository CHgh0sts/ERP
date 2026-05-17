import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatEUR, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function JournalsPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; from?: string; to?: string }>;
}) {
  await requirePermission("accounting.read");
  const sp = await searchParams;
  const journals = await prisma.journal.findMany({ orderBy: { code: "asc" } });
  const activeCode = sp.code || journals[0]?.code;

  const where: {
    journal?: { code: string };
    date?: { gte?: Date; lte?: Date };
  } = activeCode ? { journal: { code: activeCode } } : {};
  if (sp.from || sp.to) {
    where.date = {};
    if (sp.from) where.date.gte = new Date(sp.from);
    if (sp.to) where.date.lte = new Date(sp.to);
  }

  const entries = await prisma.journalEntry.findMany({
    where,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: {
      journal: true,
      lines: { include: { account: true } },
    },
    take: 200,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Journaux comptables</h1>
      <div className="flex gap-2 flex-wrap">
        {journals.map((j) => (
          <Link
            key={j.id}
            href={`/accounting/journals?code=${j.code}`}
            className={`px-3 py-1 rounded-md border text-sm ${activeCode === j.code ? "bg-accent font-medium" : "hover:bg-accent"}`}
          >
            {j.code} - {j.name}
          </Link>
        ))}
      </div>
      <form className="flex gap-2 items-end text-sm" method="get">
        <input type="hidden" name="code" value={activeCode ?? ""} />
        <div>
          <label className="block text-xs">Du</label>
          <input type="date" name="from" defaultValue={sp.from ?? ""} className="border rounded px-2 py-1" />
        </div>
        <div>
          <label className="block text-xs">Au</label>
          <input type="date" name="to" defaultValue={sp.to ?? ""} className="border rounded px-2 py-1" />
        </div>
        <button className="border rounded px-3 py-1 bg-primary text-primary-foreground">Filtrer</button>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>{entries.length} ecriture(s)</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune ecriture</p>
          ) : (
            <div className="space-y-3">
              {entries.map((e) => {
                const d = e.lines.reduce((s, l) => s + l.debit, 0);
                const c = e.lines.reduce((s, l) => s + l.credit, 0);
                return (
                  <div key={e.id} className="border rounded p-3">
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-sm">
                        <Badge variant="secondary" className="mr-2">{e.journal.code}</Badge>
                        {formatDate(e.date)} - <span className="font-mono">{e.pieceRef ?? "-"}</span> - {e.label ?? "-"}
                      </div>
                      <div className="text-xs">
                        D {formatEUR(d)} / C {formatEUR(c)}
                        {e.isPosted && <Badge className="ml-2">Validee</Badge>}
                      </div>
                    </div>
                    <table className="w-full text-xs">
                      <thead className="text-[10px] uppercase text-muted-foreground text-left">
                        <tr>
                          <th className="py-0.5">Compte</th>
                          <th>Libelle</th>
                          <th>Debit</th>
                          <th>Credit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {e.lines.map((l) => (
                          <tr key={l.id} className="border-t">
                            <td className="py-0.5 font-mono">{l.account.number} {l.account.label}</td>
                            <td>{l.label}</td>
                            <td>{l.debit > 0 ? formatEUR(l.debit) : ""}</td>
                            <td>{l.credit > 0 ? formatEUR(l.credit) : ""}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
