"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { parseOrThrow } from "@/lib/zod-fr";
import { requirePermission } from "@/lib/auth/session";
import { nextSimpleCode, nextUniqueCode } from "@/lib/codes";
import { audit } from "@/lib/audit";
import { postEntry } from "@/lib/accounting/journals";

const createSchema = z.object({
  supplierId: z.string(),
  expectedAt: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  lines: z.array(
    z.object({
      articleSupplierId: z.string(),
      qtyOrdered: z.coerce.number().min(0.001),
      unitPriceHT: z.coerce.number().min(0),
      vatRateCode: z.string().default("TVA20"),
    }),
  ),
});

export async function createSupplierOrder(raw: z.infer<typeof createSchema>) {
  const u = await requirePermission("purchase.write");
  const d = parseOrThrow(createSchema, raw);
  if (d.lines.length === 0) throw new Error("Ajoutez au moins une ligne");
  const code = await nextSimpleCode("supplier_order", "AC", 5);
  const order = await prisma.supplierOrder.create({
    data: {
      code,
      supplierId: d.supplierId,
      status: "DRAFT",
      expectedAt: d.expectedAt ? new Date(d.expectedAt) : null,
      notes: d.notes || null,
      lines: {
        create: d.lines.map((l) => ({
          articleSupplierId: l.articleSupplierId,
          qtyOrdered: l.qtyOrdered,
          unitPriceHT: l.unitPriceHT,
          vatRateCode: l.vatRateCode,
        })),
      },
    },
  });
  await audit({ userId: u.uid, action: "CREATE", entity: "SupplierOrder", entityId: order.id });
  revalidatePath("/orders/supplier");
  return { ok: true, id: order.id };
}

export async function setOrderStatus(id: string, status: string) {
  const u = await requirePermission("purchase.write");
  await prisma.supplierOrder.update({ where: { id }, data: { status } });
  await audit({ userId: u.uid, action: "STATUS_CHANGE", entity: "SupplierOrder", entityId: id, diff: { status } });
  revalidatePath(`/orders/supplier/${id}`);
  revalidatePath("/orders/supplier");
  return { ok: true };
}

const receptionSchema = z.object({
  supplierOrderId: z.string(),
  lines: z.array(
    z.object({
      supplierOrderLineId: z.string(),
      qty: z.coerce.number().min(0),
      locationId: z.string().optional().nullable(),
      lotNumber: z.string().optional().nullable(),
      packagingState: z.string().default("UNITAIRE"),
    }),
  ),
});

export async function receiveOrder(raw: z.infer<typeof receptionSchema>) {
  const u = await requirePermission("purchase.receive");
  const d = parseOrThrow(receptionSchema, raw);

  await prisma.$transaction(async (tx) => {
    const order = await tx.supplierOrder.findUnique({
      where: { id: d.supplierOrderId },
      include: { lines: { include: { articleSupplier: { include: { article: true } } } }, supplier: true },
    });
    if (!order) throw new Error("Commande introuvable");

    const reception = await tx.reception.create({
      data: { supplierOrderId: order.id, receivedAt: new Date() },
    });

    let totalHT = 0;
    const vatBreakdown = new Map<string, number>(); // rate -> base

    for (const line of d.lines) {
      if (line.qty <= 0) continue;
      const ol = order.lines.find((x) => x.id === line.supplierOrderLineId);
      if (!ol) continue;

      await tx.receptionLine.create({
        data: {
          receptionId: reception.id,
          supplierOrderLineId: line.supplierOrderLineId,
          qty: line.qty,
          locationId: line.locationId || null,
          lotNumber: line.lotNumber || null,
        },
      });

      const newQty = ol.qtyReceived + line.qty;
      await tx.supplierOrderLine.update({ where: { id: ol.id }, data: { qtyReceived: newQty } });

      // Creer une nouvelle unite de stock
      const code = await nextUniqueCode(tx);
      const unit = await tx.stockUnit.create({
        data: {
          codeUnique: code,
          articleId: ol.articleSupplier.articleId,
          locationId: line.locationId || null,
          qtyOnHand: line.qty,
          lotNumber: line.lotNumber || null,
          packagingState: line.packagingState,
          receivedAt: new Date(),
          supplierOrderLineId: ol.id,
        },
      });

      await tx.stockMovement.create({
        data: {
          stockUnitId: unit.id,
          type: "IN",
          qty: line.qty,
          toLocationId: line.locationId || null,
          supplierOrderLineId: ol.id,
          userId: u.uid,
          reason: `Reception commande ${order.code}`,
        },
      });

      // mise a jour dernier prix achat
      await tx.article.update({
        where: { id: ol.articleSupplier.articleId },
        data: { lastPurchasePrice: ol.unitPriceHT },
      });

      const baseHT = line.qty * ol.unitPriceHT;
      totalHT += baseHT;
      const vatRate = vatCodeToRate(ol.vatRateCode);
      vatBreakdown.set(String(vatRate), (vatBreakdown.get(String(vatRate)) || 0) + baseHT);
    }

    // Mise a jour du statut
    const updated = await tx.supplierOrder.findUnique({
      where: { id: order.id },
      include: { lines: true },
    });
    const allReceived = updated!.lines.every((l) => l.qtyReceived >= l.qtyOrdered);
    const anyReceived = updated!.lines.some((l) => l.qtyReceived > 0);
    await tx.supplierOrder.update({
      where: { id: order.id },
      data: { status: allReceived ? "RECEIVED" : anyReceived ? "PARTIAL" : updated!.status },
    });

    // Ecriture comptable : debit 607 HT + 44566 TVA, credit 401 TTC
    let totalVat = 0;
    for (const [rate, base] of vatBreakdown) {
      totalVat += base * (Number(rate) / 100);
    }
    const totalTTC = totalHT + totalVat;
    if (totalTTC > 0) {
      await postEntry({
        journalCode: "AC",
        date: new Date(),
        pieceRef: `REC-${order.code}-${reception.id.slice(0, 6)}`,
        label: `Reception ${order.code} - ${order.supplier.name}`,
        lines: [
          { accountNumber: "607", debit: round2(totalHT), label: "Achats marchandises" },
          ...(totalVat > 0
            ? [{ accountNumber: "44566", debit: round2(totalVat), label: "TVA deductible" }]
            : []),
          { accountNumber: "401", credit: round2(totalTTC), label: order.supplier.name },
        ],
        tx,
      });
    }
  });

  await audit({ userId: u.uid, action: "RECEIVE", entity: "SupplierOrder", entityId: d.supplierOrderId });
  revalidatePath(`/orders/supplier/${d.supplierOrderId}`);
  revalidatePath("/stock");
  return { ok: true };
}

function vatCodeToRate(code: string): number {
  const map: Record<string, number> = { TVA20: 20, TVA10: 10, TVA55: 5.5, TVA21: 2.1, TVA0: 0 };
  return map[code] ?? 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
