"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { parseOrThrow } from "@/lib/zod-fr";
import { requirePermission } from "@/lib/auth/session";
import { nextUniqueCode } from "@/lib/codes";
import { audit } from "@/lib/audit";

const createSchema = z.object({
  articleId: z.string(),
  locationId: z.string().optional().nullable(),
  qtyOnHand: z.coerce.number().min(0).default(0),
  lotNumber: z.string().optional().nullable(),
  packagingState: z.string().default("UNITAIRE"),
  receivedAt: z.string().optional().nullable(),
});

export async function createStockUnit(raw: z.infer<typeof createSchema>) {
  const u = await requirePermission("stock.adjust");
  const d = parseOrThrow(createSchema, raw);
  const result = await prisma.$transaction(async (tx) => {
    const code = await nextUniqueCode(tx);
    const unit = await tx.stockUnit.create({
      data: {
        codeUnique: code,
        articleId: d.articleId,
        locationId: d.locationId || null,
        qtyOnHand: d.qtyOnHand,
        lotNumber: d.lotNumber || null,
        packagingState: d.packagingState,
        receivedAt: d.receivedAt ? new Date(d.receivedAt) : new Date(),
      },
    });
    if (d.qtyOnHand > 0) {
      await tx.stockMovement.create({
        data: {
          stockUnitId: unit.id,
          type: "IN",
          qty: d.qtyOnHand,
          toLocationId: d.locationId || null,
          userId: u.uid,
          reason: "Saisie manuelle",
        },
      });
    }
    return unit;
  });
  await audit({ userId: u.uid, action: "CREATE", entity: "StockUnit", entityId: result.id, diff: d });
  revalidatePath("/stock");
  revalidatePath(`/components/${d.articleId}`);
  return { ok: true, id: result.id, codeUnique: result.codeUnique };
}

const adjustSchema = z.object({
  stockUnitId: z.string(),
  type: z.enum(["IN", "OUT", "ADJUST", "TRANSFER"]),
  qty: z.coerce.number(),
  toLocationId: z.string().optional().nullable(),
  reason: z.string().optional().nullable(),
});

export async function adjustStock(raw: z.infer<typeof adjustSchema>) {
  const u = await requirePermission("stock.adjust");
  const d = parseOrThrow(adjustSchema, raw);
  await prisma.$transaction(async (tx) => {
    const unit = await tx.stockUnit.findUnique({ where: { id: d.stockUnitId } });
    if (!unit) throw new Error("Unite de stock introuvable");
    let newQty = unit.qtyOnHand;
    let fromLoc = unit.locationId;
    let toLoc = unit.locationId;
    if (d.type === "IN") newQty += d.qty;
    else if (d.type === "OUT") newQty -= d.qty;
    else if (d.type === "ADJUST") newQty = d.qty;
    else if (d.type === "TRANSFER") {
      fromLoc = unit.locationId;
      toLoc = d.toLocationId || null;
    }
    if (newQty < 0) throw new Error("Stock ne peut etre negatif");

    const updateData: { qtyOnHand: number; locationId?: string | null } = { qtyOnHand: newQty };
    if (d.type === "TRANSFER") updateData.locationId = toLoc;

    await tx.stockUnit.update({ where: { id: d.stockUnitId }, data: updateData });
    await tx.stockMovement.create({
      data: {
        stockUnitId: d.stockUnitId,
        type: d.type,
        qty: Math.abs(d.qty),
        fromLocationId: fromLoc,
        toLocationId: toLoc,
        userId: u.uid,
        reason: d.reason || null,
      },
    });
  });
  await audit({ userId: u.uid, action: `STOCK_${d.type}`, entity: "StockUnit", entityId: d.stockUnitId, diff: d });
  revalidatePath("/stock");
  return { ok: true };
}
