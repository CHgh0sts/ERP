import { prisma } from "@/lib/db";
import { format } from "date-fns";

// Generation du Fichier des Ecritures Comptables (FEC) format DGFiP
// 18 colonnes, separateur = tabulation, encodage ISO-8859-15 (gere cote route)
export async function generateFEC(fiscalYearId: string): Promise<string> {
  const fy = await prisma.fiscalYear.findUnique({ where: { id: fiscalYearId } });
  if (!fy) throw new Error("Exercice introuvable");

  const entries = await prisma.journalEntry.findMany({
    where: { fiscalYearId, isPosted: true },
    include: {
      journal: true,
      lines: { include: { account: true } },
    },
    orderBy: { date: "asc" },
  });

  const header = [
    "JournalCode",
    "JournalLib",
    "EcritureNum",
    "EcritureDate",
    "CompteNum",
    "CompteLib",
    "CompAuxNum",
    "CompAuxLib",
    "PieceRef",
    "PieceDate",
    "EcritureLib",
    "Debit",
    "Credit",
    "EcritureLet",
    "DateLet",
    "ValidDate",
    "Montantdevise",
    "Idevise",
  ].join("\t");

  const rows: string[] = [header];
  let num = 0;
  for (const e of entries) {
    num++;
    for (const l of e.lines) {
      const row = [
        e.journal.code,
        e.journal.name,
        String(num),
        format(e.date, "yyyyMMdd"),
        l.account.number,
        l.account.label,
        "",
        "",
        e.pieceRef ?? String(num),
        format(e.date, "yyyyMMdd"),
        (l.label || e.label || "").replace(/\t/g, " "),
        (l.debit || 0).toFixed(2).replace(".", ","),
        (l.credit || 0).toFixed(2).replace(".", ","),
        "",
        "",
        e.postedAt ? format(e.postedAt, "yyyyMMdd") : "",
        "",
        "",
      ].join("\t");
      rows.push(row);
    }
  }
  return rows.join("\r\n");
}
