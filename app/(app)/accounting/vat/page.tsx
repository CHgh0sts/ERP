import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEUR, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Declaration CA3 simplifiee (regime reel normal mensuel)
// Basee sur les comptes : 44571 (TVA collectee), 44566 (TVA deductible), 707 (ventes HT), 607 (achats HT)
export default async function VatPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requirePermission("accounting.read");
  const sp = await searchParams;

  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  const from = sp.from || defaultFrom;
  const to = sp.to || defaultTo;

  const lines = await prisma.journalEntryLine.findMany({
    where: {
      entry: {
        isPosted: true,
        date: { gte: new Date(from), lte: new Date(to) },
      },
    },
    include: { account: true },
  });

  function agg(prefix: string, side: "debit" | "credit") {
    return lines
      .filter((l) => l.account.number.startsWith(prefix))
      .reduce((s, l) => s + (side === "debit" ? l.debit - l.credit : l.credit - l.debit), 0);
  }

  const tvaCollectee = agg("44571", "credit");
  const tvaDeductible = agg("44566", "debit");
  const ventesHT = agg("707", "credit");
  const achatsHT = agg("607", "debit");
  const solde = tvaCollectee - tvaDeductible;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Declaration de TVA (CA3)</h1>
      <form className="flex gap-2 items-end text-sm" method="get">
        <div>
          <label className="block text-xs">Du</label>
          <input type="date" name="from" defaultValue={from} className="border rounded px-2 py-1" />
        </div>
        <div>
          <label className="block text-xs">Au</label>
          <input type="date" name="to" defaultValue={to} className="border rounded px-2 py-1" />
        </div>
        <button className="border rounded px-3 py-1 bg-primary text-primary-foreground">Afficher</button>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>
            Periode : {formatDate(new Date(from))} au {formatDate(new Date(to))}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-t">
                <td className="py-2">Ventes HT (707)</td>
                <td className="text-right">{formatEUR(ventesHT)}</td>
              </tr>
              <tr className="border-t">
                <td className="py-2">Achats HT (607)</td>
                <td className="text-right">{formatEUR(achatsHT)}</td>
              </tr>
              <tr className="border-t">
                <td className="py-2">TVA collectee (44571)</td>
                <td className="text-right">{formatEUR(tvaCollectee)}</td>
              </tr>
              <tr className="border-t">
                <td className="py-2">TVA deductible (44566)</td>
                <td className="text-right">{formatEUR(tvaDeductible)}</td>
              </tr>
              <tr className="border-t font-bold">
                <td className="py-2">{solde >= 0 ? "TVA a payer" : "Credit de TVA"}</td>
                <td className={`text-right ${solde >= 0 ? "text-destructive" : "text-emerald-600"}`}>
                  {formatEUR(Math.abs(solde))}
                </td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground mt-3">
            Simplification : cette vue agrege les mouvements sur les comptes 707, 607, 44571 et 44566. Pour une CA3 officielle a
            telecharger, generez le FEC et utilisez impots.gouv.fr.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
