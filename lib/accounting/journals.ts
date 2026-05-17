import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export async function getCurrentFiscalYear(at: Date = new Date(), tx?: Prisma.TransactionClient) {
  const client = tx ?? prisma;
  const fy = await client.fiscalYear.findFirst({
    where: { startDate: { lte: at }, endDate: { gte: at } },
    orderBy: { startDate: "desc" },
  });
  if (!fy) {
    return client.fiscalYear.findFirst({ orderBy: { startDate: "desc" } });
  }
  return fy;
}

export async function getJournalByCode(code: string, tx?: Prisma.TransactionClient) {
  const client = tx ?? prisma;
  return client.journal.findUnique({ where: { code } });
}

export async function getAccountByNumber(number: string, tx?: Prisma.TransactionClient) {
  const client = tx ?? prisma;
  return client.account.findUnique({ where: { number } });
}

export type EntryLine = { accountNumber: string; debit?: number; credit?: number; label?: string };

export async function postEntry(params: {
  journalCode: string;
  date: Date;
  pieceRef?: string;
  label?: string;
  lines: EntryLine[];
  tx?: Prisma.TransactionClient;
}): Promise<string> {
  const client = params.tx ?? prisma;
  const journal = await client.journal.findUnique({ where: { code: params.journalCode } });
  if (!journal) throw new Error(`Journal ${params.journalCode} introuvable`);

  const fy = await getCurrentFiscalYear(params.date, params.tx);
  if (!fy) throw new Error("Aucun exercice fiscal actif");
  if (fy.isClosed) throw new Error("Exercice fiscal cloture");

  const totalDebit = params.lines.reduce((s, l) => s + (l.debit || 0), 0);
  const totalCredit = params.lines.reduce((s, l) => s + (l.credit || 0), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.005) {
    throw new Error(
      `Ecriture non equilibree : debit=${totalDebit.toFixed(2)} credit=${totalCredit.toFixed(2)}`,
    );
  }

  const accountMap = new Map<string, string>();
  for (const l of params.lines) {
    if (!accountMap.has(l.accountNumber)) {
      const acc = await client.account.findUnique({ where: { number: l.accountNumber } });
      if (!acc) throw new Error(`Compte ${l.accountNumber} introuvable`);
      accountMap.set(l.accountNumber, acc.id);
    }
  }

  const entry = await client.journalEntry.create({
    data: {
      journalId: journal.id,
      fiscalYearId: fy.id,
      date: params.date,
      pieceRef: params.pieceRef,
      label: params.label,
      isPosted: true,
      postedAt: new Date(),
      lines: {
        create: params.lines.map((l) => ({
          accountId: accountMap.get(l.accountNumber)!,
          debit: l.debit || 0,
          credit: l.credit || 0,
          label: l.label,
        })),
      },
    },
  });
  return entry.id;
}
