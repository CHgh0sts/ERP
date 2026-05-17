import { prisma } from "@/lib/db";
import { pad } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

export async function nextSequence(
  key: string,
  tx?: Prisma.TransactionClient,
): Promise<number> {
  const client = tx ?? prisma;
  const current = await client.sequence.findUnique({ where: { key } });
  const value = (current?.value ?? 0) + 1;
  await client.sequence.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
  return value;
}

export async function nextArticleCode(tx?: Prisma.TransactionClient): Promise<string> {
  const client = tx ?? prisma;
  const cfg = await client.appConfig.findUnique({ where: { id: 1 } });
  const prefix = cfg?.articleCodePrefix ?? "C";
  const padLen = cfg?.articleCodePadding ?? 6;
  const n = await nextSequence("article", tx);
  return `${prefix}${pad(n, padLen)}`;
}

export async function nextUniqueCode(tx?: Prisma.TransactionClient): Promise<string> {
  const client = tx ?? prisma;
  const cfg = await client.appConfig.findUnique({ where: { id: 1 } });
  const prefix = cfg?.uniqueCodePrefix ?? "";
  const padLen = cfg?.uniqueCodePadding ?? 6;
  const n = await nextSequence("stock_unit", tx);
  return `${prefix}${pad(n, padLen)}`;
}

export async function nextOfCode(tx?: Prisma.TransactionClient): Promise<string> {
  const client = tx ?? prisma;
  const cfg = await client.appConfig.findUnique({ where: { id: 1 } });
  const prefix = cfg?.ofCodePrefix ?? "OF";
  const padLen = cfg?.ofCodePadding ?? 6;
  const n = await nextSequence("of", tx);
  return `${prefix}${pad(n, padLen)}`;
}

export async function nextInvoiceCode(tx?: Prisma.TransactionClient): Promise<string> {
  const client = tx ?? prisma;
  const cfg = await client.appConfig.findUnique({ where: { id: 1 } });
  const prefix = cfg?.invoiceCodePrefix ?? "FA";
  const padLen = cfg?.invoiceCodePadding ?? 6;
  const n = await nextSequence("invoice", tx);
  return `${prefix}${pad(n, padLen)}`;
}

export async function nextSimpleCode(key: string, prefix: string, padLen = 5): Promise<string> {
  const n = await nextSequence(key);
  return `${prefix}${pad(n, padLen)}`;
}
