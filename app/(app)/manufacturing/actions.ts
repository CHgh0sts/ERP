"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { parseOrThrow } from "@/lib/zod-fr";
import { requirePermission } from "@/lib/auth/session";
import { nextOfCode, nextSimpleCode } from "@/lib/codes";
import { audit } from "@/lib/audit";
import type { Prisma } from "@prisma/client";

const createSchema = z.object({
  productId: z.string(),
  bomId: z.string(),
  qty: z.coerce.number().int().min(1),
  plannedStart: z.string().optional().nullable(),
  plannedEnd: z.string().optional().nullable(),
  customerOrderId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function createManufacturingOrder(raw: z.infer<typeof createSchema>) {
  const u = await requirePermission("of.create");
  const d = parseOrThrow(createSchema, raw);

  const of = await prisma.$transaction(async (tx) => {
    const bom = await tx.bom.findUnique({ where: { id: d.bomId }, include: { lines: true } });
    if (!bom) throw new Error("BOM introuvable");
    if (bom.productId !== d.productId) throw new Error("La BOM ne correspond pas au produit");

    const code = await nextOfCode(tx);
    const created = await tx.manufacturingOrder.create({
      data: {
        code,
        productId: d.productId,
        bomId: d.bomId,
        qty: d.qty,
        status: "DRAFT",
        plannedStart: d.plannedStart ? new Date(d.plannedStart) : null,
        plannedEnd: d.plannedEnd ? new Date(d.plannedEnd) : null,
        customerOrderId: d.customerOrderId || null,
        notes: d.notes || null,
      },
    });

    for (const line of bom.lines) {
      await tx.ofReservation.create({
        data: {
          ofId: created.id,
          articleId: line.articleId,
          qtyNeeded: line.qtyPerUnit * d.qty,
        },
      });
    }
    return created;
  });

  await audit({ userId: u.uid, action: "CREATE", entity: "ManufacturingOrder", entityId: of.id });
  revalidatePath("/manufacturing");
  return { ok: true, id: of.id };
}

export async function createOfFromCustomerOrder(customerOrderId: string) {
  const u = await requirePermission("of.create");
  const order = await prisma.customerOrder.findUnique({
    where: { id: customerOrderId },
    include: {
      lines: { include: { product: { include: { boms: { where: { isActive: true } } } } } },
    },
  });
  if (!order) throw new Error("Commande introuvable");
  if (order.status !== "CONFIRMED" && order.status !== "IN_PRODUCTION") {
    throw new Error("Commande non confirmee");
  }
  let firstId = "";
  for (const line of order.lines) {
    const bom = line.product.boms[0];
    if (!bom) throw new Error(`Aucune BOM active pour ${line.product.code}`);
    const r = await createManufacturingOrder({
      productId: line.productId,
      bomId: bom.id,
      qty: line.qty,
      customerOrderId: order.id,
      plannedStart: null,
      plannedEnd: null,
      notes: `Genere depuis commande ${order.code}`,
    });
    if (!firstId) firstId = r.id;
  }
  if (order.status === "CONFIRMED") {
    await prisma.customerOrder.update({ where: { id: order.id }, data: { status: "IN_PRODUCTION" } });
  }
  await audit({ userId: u.uid, action: "GENERATE_OF", entity: "CustomerOrder", entityId: order.id });
  revalidatePath("/manufacturing");
  revalidatePath(`/orders/customer/${order.id}`);
  return { ok: true, id: firstId };
}

export async function reserveOf(ofId: string) {
  const u = await requirePermission("of.execute");

  const shortages: { articleId: string; codeArticle: string; description: string; missing: number }[] = [];

  await prisma.$transaction(async (tx) => {
    const of = await tx.manufacturingOrder.findUnique({
      where: { id: ofId },
      include: { reservations: { include: { article: true } } },
    });
    if (!of) throw new Error("OF introuvable");
    if (of.status !== "DRAFT" && of.status !== "PLANNED" && of.status !== "RESERVED") {
      throw new Error("Statut OF invalide pour reservation");
    }

    for (const res of of.reservations) {
      const toReserve = res.qtyNeeded - res.qtyReserved;
      if (toReserve <= 0) continue;

      const units = await tx.stockUnit.findMany({
        where: {
          articleId: res.articleId,
          qtyOnHand: { gt: 0 },
        },
        orderBy: [{ receivedAt: "asc" }, { createdAt: "asc" }],
      });

      let remaining = toReserve;
      for (const unit of units) {
        if (remaining <= 0) break;
        const available = unit.qtyOnHand - unit.qtyReserved;
        if (available <= 0) continue;
        const take = Math.min(available, remaining);
        await tx.stockUnit.update({
          where: { id: unit.id },
          data: { qtyReserved: unit.qtyReserved + take },
        });
        await tx.stockMovement.create({
          data: {
            stockUnitId: unit.id,
            type: "RESERVE",
            qty: take,
            ofId: ofId,
            userId: u.uid,
            reason: `Reservation OF ${of.code}`,
          },
        });
        remaining -= take;
      }

      const actuallyReserved = toReserve - remaining;
      if (actuallyReserved > 0) {
        await tx.ofReservation.update({
          where: { id: res.id },
          data: { qtyReserved: res.qtyReserved + actuallyReserved },
        });
      }
      if (remaining > 0) {
        shortages.push({
          articleId: res.articleId,
          codeArticle: res.article.codeArticle,
          description: res.article.description,
          missing: remaining,
        });
      }
    }

    const fresh = await tx.ofReservation.findMany({ where: { ofId } });
    const fullyReserved = fresh.every((r) => r.qtyReserved >= r.qtyNeeded);
    await tx.manufacturingOrder.update({
      where: { id: ofId },
      data: { status: fullyReserved ? "RESERVED" : "DRAFT" },
    });
  });

  await audit({ userId: u.uid, action: "RESERVE", entity: "ManufacturingOrder", entityId: ofId, diff: { shortages } });
  revalidatePath(`/manufacturing/${ofId}`);
  revalidatePath("/stock");
  return { ok: true, shortages };
}

export async function triggerPurchaseForShortages(ofId: string) {
  const u = await requirePermission("purchase.write");

  const createdOrders: { supplierId: string; supplierName: string; orderId: string; code: string }[] = [];

  await prisma.$transaction(async (tx) => {
    const of = await tx.manufacturingOrder.findUnique({
      where: { id: ofId },
      include: { reservations: { include: { article: { include: { suppliers: { include: { supplier: true } } } } } } },
    });
    if (!of) throw new Error("OF introuvable");

    const bySupplier = new Map<
      string,
      { supplierName: string; lines: { articleSupplierId: string; qty: number; unitPriceHT: number }[] }
    >();

    for (const res of of.reservations) {
      const missing = res.qtyNeeded - res.qtyReserved;
      if (missing <= 0) continue;
      const sups = res.article.suppliers;
      if (sups.length === 0) continue;
      const preferred = sups.find((s) => s.isPreferred) ?? sups[0];
      const qty = Math.max(missing, preferred.moq);
      const entry = bySupplier.get(preferred.supplierId) ?? {
        supplierName: preferred.supplier.name,
        lines: [],
      };
      entry.lines.push({
        articleSupplierId: preferred.id,
        qty,
        unitPriceHT: preferred.priceHT,
      });
      bySupplier.set(preferred.supplierId, entry);
    }

    for (const [supplierId, entry] of bySupplier) {
      const code = await nextSimpleCodeTx(tx, "supplier_order", "AC", 5);
      const order = await tx.supplierOrder.create({
        data: {
          code,
          supplierId,
          status: "DRAFT",
          notes: `Auto-genere pour OF ${of.code}`,
          lines: {
            create: entry.lines.map((l) => ({
              articleSupplierId: l.articleSupplierId,
              qtyOrdered: l.qty,
              unitPriceHT: l.unitPriceHT,
              vatRateCode: "TVA20",
            })),
          },
        },
      });
      createdOrders.push({ supplierId, supplierName: entry.supplierName, orderId: order.id, code: order.code });
    }
  });

  for (const o of createdOrders) {
    await audit({ userId: u.uid, action: "AUTO_CREATE", entity: "SupplierOrder", entityId: o.orderId });
  }
  revalidatePath("/orders/supplier");
  revalidatePath(`/manufacturing/${ofId}`);
  return { ok: true, orders: createdOrders };
}

async function nextSimpleCodeTx(tx: Prisma.TransactionClient, key: string, prefix: string, padLen: number) {
  const current = await tx.sequence.findUnique({ where: { key } });
  const value = (current?.value ?? 0) + 1;
  await tx.sequence.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
  return `${prefix}${String(value).padStart(padLen, "0")}`;
}

export async function startOf(ofId: string) {
  const u = await requirePermission("of.execute");
  const of = await prisma.manufacturingOrder.findUnique({ where: { id: ofId } });
  if (!of) throw new Error("OF introuvable");
  if (of.status !== "RESERVED") throw new Error("Reservez d'abord les composants");
  await prisma.manufacturingOrder.update({
    where: { id: ofId },
    data: { status: "IN_PROGRESS", startedAt: new Date() },
  });
  await audit({ userId: u.uid, action: "START", entity: "ManufacturingOrder", entityId: ofId });
  revalidatePath(`/manufacturing/${ofId}`);
  return { ok: true };
}

const consumeSchema = z.object({
  ofId: z.string(),
  consumptions: z.array(
    z.object({
      stockUnitId: z.string(),
      qty: z.coerce.number().min(0),
    }),
  ),
});

export async function consumeAndFinish(raw: z.infer<typeof consumeSchema>) {
  const u = await requirePermission("of.execute");
  const d = parseOrThrow(consumeSchema, raw);

  await prisma.$transaction(async (tx) => {
    const of = await tx.manufacturingOrder.findUnique({
      where: { id: d.ofId },
      include: { reservations: true },
    });
    if (!of) throw new Error("OF introuvable");
    if (of.status !== "IN_PROGRESS" && of.status !== "RESERVED") throw new Error("Statut OF invalide");

    for (const c of d.consumptions) {
      if (c.qty <= 0) continue;
      const unit = await tx.stockUnit.findUnique({ where: { id: c.stockUnitId } });
      if (!unit) throw new Error("Unite de stock introuvable");
      if (c.qty > unit.qtyOnHand) throw new Error(`Qte a consommer > stock (unit ${unit.codeUnique})`);

      await tx.stockUnit.update({
        where: { id: unit.id },
        data: {
          qtyOnHand: unit.qtyOnHand - c.qty,
          qtyReserved: Math.max(0, unit.qtyReserved - c.qty),
        },
      });
      await tx.stockMovement.create({
        data: {
          stockUnitId: unit.id,
          type: "OUT",
          qty: c.qty,
          ofId: d.ofId,
          userId: u.uid,
          reason: `Consommation OF ${of.code}`,
        },
      });
      await tx.ofConsumption.create({
        data: { ofId: d.ofId, stockUnitId: unit.id, qty: c.qty },
      });

      const res = of.reservations.find((r) => r.articleId === unit.articleId);
      if (res) {
        await tx.ofReservation.update({
          where: { id: res.id },
          data: { qtyConsumed: res.qtyConsumed + c.qty, qtyReserved: Math.max(0, res.qtyReserved - c.qty) },
        });
      }
    }

    await tx.manufacturingOrder.update({
      where: { id: d.ofId },
      data: { status: "DONE", completedAt: new Date() },
    });
  });

  await audit({ userId: u.uid, action: "COMPLETE", entity: "ManufacturingOrder", entityId: d.ofId });
  revalidatePath(`/manufacturing/${d.ofId}`);
  revalidatePath("/stock");
  return { ok: true };
}

export async function cancelOf(ofId: string) {
  const u = await requirePermission("of.execute");

  await prisma.$transaction(async (tx) => {
    const of = await tx.manufacturingOrder.findUnique({
      where: { id: ofId },
      include: { reservations: true },
    });
    if (!of) throw new Error("OF introuvable");
    if (of.status === "DONE") throw new Error("OF deja termine");
    if (of.status === "CANCELLED") return;

    // Liberer les reservations
    for (const res of of.reservations) {
      if (res.qtyReserved <= 0) continue;
      let remaining = res.qtyReserved;
      const units = await tx.stockUnit.findMany({
        where: { articleId: res.articleId, qtyReserved: { gt: 0 } },
      });
      for (const unit of units) {
        if (remaining <= 0) break;
        const release = Math.min(unit.qtyReserved, remaining);
        await tx.stockUnit.update({
          where: { id: unit.id },
          data: { qtyReserved: unit.qtyReserved - release },
        });
        await tx.stockMovement.create({
          data: {
            stockUnitId: unit.id,
            type: "RELEASE",
            qty: release,
            ofId: ofId,
            userId: u.uid,
            reason: `Annulation OF ${of.code}`,
          },
        });
        remaining -= release;
      }
      await tx.ofReservation.update({ where: { id: res.id }, data: { qtyReserved: 0 } });
    }

    await tx.manufacturingOrder.update({ where: { id: ofId }, data: { status: "CANCELLED" } });
  });

  await audit({ userId: u.uid, action: "CANCEL", entity: "ManufacturingOrder", entityId: ofId });
  revalidatePath(`/manufacturing/${ofId}`);
  revalidatePath("/stock");
  return { ok: true };
}

export async function getManufacturingOrderFormData() {
  await requirePermission("of.read");
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    include: { boms: { orderBy: { createdAt: "desc" } } },
    orderBy: { code: "asc" },
  });
  return products
    .filter((p) => p.boms.length > 0)
    .map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      boms: p.boms.map((b) => ({ id: b.id, version: b.version, isActive: b.isActive })),
    }));
}
