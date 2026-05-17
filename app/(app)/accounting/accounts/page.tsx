import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  ASSET: "Actif",
  LIABILITY: "Passif",
  EQUITY: "Capitaux propres",
  EXPENSE: "Charges",
  REVENUE: "Produits",
};

export default async function AccountsPage() {
  await requirePermission("accounting.read");
  const accounts = await prisma.account.findMany({ orderBy: { number: "asc" } });
  const byClass: Record<string, typeof accounts> = {};
  for (const a of accounts) {
    const c = a.number[0] ?? "?";
    (byClass[c] ??= []).push(a);
  }
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Plan comptable (PCG FR)</h1>
      <p className="text-sm text-muted-foreground">{accounts.length} comptes configures</p>
      {Object.entries(byClass).map(([c, list]) => (
        <Card key={c}>
          <CardHeader>
            <CardTitle>Classe {c}</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-1">Numero</th>
                  <th>Libelle</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {list.map((a) => (
                  <tr key={a.id} className="border-t">
                    <td className="py-1 font-mono">{a.number}</td>
                    <td>{a.label}</td>
                    <td>
                      <Badge variant="secondary">{TYPE_LABEL[a.type] ?? a.type}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
