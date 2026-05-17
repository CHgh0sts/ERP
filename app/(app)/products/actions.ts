"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { parseOrThrow } from "@/lib/zod-fr";
import { requirePermission } from "@/lib/auth/session";
import { nextSimpleCode } from "@/lib/codes";
import { audit } from "@/lib/audit";

const productSchema = z.object({
  code: z.string().optional().nullable(),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  salePriceHT: z.coerce.number().optional().nullable(),
});

export async function createProduct(raw: z.infer<typeof productSchema>) {
  const u = await requirePermission("products.write");
  const d = parseOrThrow(productSchema, raw);
  const code = d.code || (await nextSimpleCode("product", "P", 5));
  const created = await prisma.product.create({
    data: {
      code,
      name: d.name,
      description: d.description || null,
      salePriceHT: d.salePriceHT ?? null,
    },
  });
  await audit({ userId: u.uid, action: "CREATE", entity: "Product", entityId: created.id });
  revalidatePath("/products");
  return { ok: true, id: created.id };
}

export async function updateProduct(id: string, raw: z.infer<typeof productSchema>) {
  const u = await requirePermission("products.write");
  const d = parseOrThrow(productSchema, raw);
  await prisma.product.update({
    where: { id },
    data: {
      name: d.name,
      description: d.description || null,
      salePriceHT: d.salePriceHT ?? null,
    },
  });
  await audit({ userId: u.uid, action: "UPDATE", entity: "Product", entityId: id });
  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
  return { ok: true };
}

export async function deleteProduct(id: string) {
  const u = await requirePermission("products.write");
  await prisma.product.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit({ userId: u.uid, action: "DELETE", entity: "Product", entityId: id });
  revalidatePath("/products");
  return { ok: true };
}

// ============= BOM =============

const bomSchema = z.object({
  productId: z.string(),
  version: z.string().min(1),
  isActive: z.boolean().default(false),
  lines: z.array(
    z.object({
      articleId: z.string(),
      qtyPerUnit: z.coerce.number().min(0.000001),
      reference: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
    }),
  ),
});

export async function createBom(raw: z.infer<typeof bomSchema>) {
  const u = await requirePermission("products.write");
  const d = parseOrThrow(bomSchema, raw);
  const bom = await prisma.$transaction(async (tx) => {
    if (d.isActive) {
      await tx.bom.updateMany({ where: { productId: d.productId }, data: { isActive: false } });
    }
    return tx.bom.create({
      data: {
        productId: d.productId,
        version: d.version,
        isActive: d.isActive,
        lines: {
          create: d.lines.map((l) => ({
            articleId: l.articleId,
            qtyPerUnit: l.qtyPerUnit,
            reference: l.reference || null,
            notes: l.notes || null,
          })),
        },
      },
    });
  });
  await audit({ userId: u.uid, action: "CREATE", entity: "Bom", entityId: bom.id });
  revalidatePath(`/products/${d.productId}`);
  return { ok: true, id: bom.id };
}

export async function updateBom(id: string, raw: z.infer<typeof bomSchema>) {
  const u = await requirePermission("products.write");
  const d = parseOrThrow(bomSchema, raw);
  await prisma.$transaction(async (tx) => {
    if (d.isActive) {
      await tx.bom.updateMany({
        where: { productId: d.productId, NOT: { id } },
        data: { isActive: false },
      });
    }
    await tx.bomLine.deleteMany({ where: { bomId: id } });
    await tx.bom.update({
      where: { id },
      data: {
        version: d.version,
        isActive: d.isActive,
        lines: {
          create: d.lines.map((l) => ({
            articleId: l.articleId,
            qtyPerUnit: l.qtyPerUnit,
            reference: l.reference || null,
            notes: l.notes || null,
          })),
        },
      },
    });
  });
  await audit({ userId: u.uid, action: "UPDATE", entity: "Bom", entityId: id });
  revalidatePath(`/products/${d.productId}`);
  return { ok: true };
}

export async function setBomActive(id: string) {
  const u = await requirePermission("products.write");
  const bom = await prisma.bom.findUnique({ where: { id } });
  if (!bom) throw new Error("BOM introuvable");
  await prisma.$transaction(async (tx) => {
    await tx.bom.updateMany({ where: { productId: bom.productId }, data: { isActive: false } });
    await tx.bom.update({ where: { id }, data: { isActive: true } });
  });
  await audit({ userId: u.uid, action: "ACTIVATE", entity: "Bom", entityId: id });
  revalidatePath(`/products/${bom.productId}`);
  return { ok: true };
}

export async function deleteBom(id: string) {
  const u = await requirePermission("products.write");
  const bom = await prisma.bom.findUnique({ where: { id } });
  if (!bom) throw new Error("BOM introuvable");
  const used = await prisma.manufacturingOrder.count({ where: { bomId: id } });
  if (used > 0) throw new Error("BOM utilise par un OF, suppression impossible");
  await prisma.bom.delete({ where: { id } });
  await audit({ userId: u.uid, action: "DELETE", entity: "Bom", entityId: id });
  revalidatePath(`/products/${bom.productId}`);
  return { ok: true };
}
