import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export async function articleStockSummary(articleId: string, tx?: Prisma.TransactionClient) {
  const client = tx ?? prisma;
  const agg = await client.stockUnit.aggregate({
    where: { articleId },
    _sum: { qtyOnHand: true, qtyReserved: true },
  });
  const onHand = agg._sum.qtyOnHand || 0;
  const reserved = agg._sum.qtyReserved || 0;
  return { onHand, reserved, available: onHand - reserved };
}

export async function locationStockSummary(locationId: string) {
  const units = await prisma.stockUnit.findMany({
    where: { locationId },
    include: { article: true },
  });
  return units;
}
