import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function FecPage() {
  await requirePermission("accounting.fec.export");
  const years = await prisma.fiscalYear.findMany({
    orderBy: { startDate: "desc" },
    include: { _count: { select: { journalEntries: true } } },
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Export FEC DGFiP</h1>
      <Card>
        <CardHeader>
          <CardTitle>Exercices disponibles</CardTitle>
        </CardHeader>
        <CardContent>
          {years.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun exercice</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-1">Libelle</th>
                  <th>Du</th>
                  <th>Au</th>
                  <th>Ecritures</th>
                  <th>Cloture</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {years.map((y) => (
                  <tr key={y.id} className="border-t">
                    <td className="py-1">{y.label}</td>
                    <td>{formatDate(y.startDate)}</td>
                    <td>{formatDate(y.endDate)}</td>
                    <td>{y._count.journalEntries}</td>
                    <td>{y.isClosed ? "Oui" : "Non"}</td>
                    <td>
                      <a
                        href={`/api/accounting/fec/${y.id}`}
                        className="inline-block px-3 py-1 rounded bg-primary text-primary-foreground text-sm"
                      >
                        Telecharger FEC
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            Le fichier FEC est genere au format texte tabule (UTF-8). Le nom respecte la convention DGFiP (SIREN + date de
            cloture).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
