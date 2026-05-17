import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEUR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function StatementsPage({
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

  const lines = await prisma.journalEntryLine.findMany({ where, include: { account: true } });

  // Agregation par premier chiffre du compte (classes PCG)
  type Group = { debit: number; credit: number };
  const byClass = new Map<string, Group>();
  const byAccount = new Map<string, { number: string; label: string; type: string; debit: number; credit: number }>();
  for (const l of lines) {
    const c = l.account.number[0];
    const cur = byClass.get(c) ?? { debit: 0, credit: 0 };
    cur.debit += l.debit;
    cur.credit += l.credit;
    byClass.set(c, cur);

    const k = l.account.number;
    const a = byAccount.get(k) ?? {
      number: l.account.number,
      label: l.account.label,
      type: l.account.type,
      debit: 0,
      credit: 0,
    };
    a.debit += l.debit;
    a.credit += l.credit;
    byAccount.set(k, a);
  }

  // Compte de resultat : classe 6 (charges) vs classe 7 (produits)
  const charges = Array.from(byAccount.values())
    .filter((a) => a.number.startsWith("6"))
    .sort((a, b) => a.number.localeCompare(b.number));
  const produits = Array.from(byAccount.values())
    .filter((a) => a.number.startsWith("7"))
    .sort((a, b) => a.number.localeCompare(b.number));

  const totalCharges = charges.reduce((s, a) => s + (a.debit - a.credit), 0);
  const totalProduits = produits.reduce((s, a) => s + (a.credit - a.debit), 0);
  const resultat = totalProduits - totalCharges;

  // Bilan : actif (classes 2,3,4,5 ayant solde debiteur) / passif (1,4,5 crediteur)
  const bilanAccounts = Array.from(byAccount.values()).filter((a) => /^[12345]/.test(a.number));
  const actif = bilanAccounts
    .map((a) => ({ ...a, solde: a.debit - a.credit }))
    .filter((a) => a.solde > 0.005)
    .sort((a, b) => a.number.localeCompare(b.number));
  const passif = bilanAccounts
    .map((a) => ({ ...a, solde: a.credit - a.debit }))
    .filter((a) => a.solde > 0.005)
    .sort((a, b) => a.number.localeCompare(b.number));

  const totalActif = actif.reduce((s, a) => s + a.solde, 0);
  const totalPassif = passif.reduce((s, a) => s + a.solde, 0);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Bilan / Compte de resultat</h1>
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
          <CardTitle>Compte de resultat</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium mb-2">Charges (classe 6)</h3>
            <table className="w-full text-sm">
              <tbody>
                {charges.map((a) => (
                  <tr key={a.number} className="border-t">
                    <td className="py-1 font-mono text-xs">{a.number}</td>
                    <td>{a.label}</td>
                    <td className="text-right">{formatEUR(a.debit - a.credit)}</td>
                  </tr>
                ))}
                <tr className="border-t font-bold">
                  <td colSpan={2} className="py-2">Total charges</td>
                  <td className="text-right">{formatEUR(totalCharges)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div>
            <h3 className="font-medium mb-2">Produits (classe 7)</h3>
            <table className="w-full text-sm">
              <tbody>
                {produits.map((a) => (
                  <tr key={a.number} className="border-t">
                    <td className="py-1 font-mono text-xs">{a.number}</td>
                    <td>{a.label}</td>
                    <td className="text-right">{formatEUR(a.credit - a.debit)}</td>
                  </tr>
                ))}
                <tr className="border-t font-bold">
                  <td colSpan={2} className="py-2">Total produits</td>
                  <td className="text-right">{formatEUR(totalProduits)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
        <CardContent>
          <div className={`text-lg font-bold text-right ${resultat >= 0 ? "text-emerald-600" : "text-destructive"}`}>
            Resultat : {formatEUR(resultat)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bilan</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium mb-2">Actif</h3>
            <table className="w-full text-sm">
              <tbody>
                {actif.map((a) => (
                  <tr key={a.number} className="border-t">
                    <td className="py-1 font-mono text-xs">{a.number}</td>
                    <td>{a.label}</td>
                    <td className="text-right">{formatEUR(a.solde)}</td>
                  </tr>
                ))}
                <tr className="border-t font-bold">
                  <td colSpan={2} className="py-2">Total actif</td>
                  <td className="text-right">{formatEUR(totalActif)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div>
            <h3 className="font-medium mb-2">Passif</h3>
            <table className="w-full text-sm">
              <tbody>
                {passif.map((a) => (
                  <tr key={a.number} className="border-t">
                    <td className="py-1 font-mono text-xs">{a.number}</td>
                    <td>{a.label}</td>
                    <td className="text-right">{formatEUR(a.solde)}</td>
                  </tr>
                ))}
                <tr className="border-t font-bold">
                  <td colSpan={2} className="py-2">Total passif</td>
                  <td className="text-right">{formatEUR(totalPassif)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Le bilan affiche les soldes bruts, sans affectation du resultat. Ecart Actif - Passif : {formatEUR(totalActif - totalPassif)}.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
