"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { nextArticleCode } from "@/lib/codes";
import { audit } from "@/lib/audit";
import { saveFile } from "@/lib/upload";
import { parseOrThrow } from "@/lib/zod-fr";
import { importArticlesFromText } from "@/lib/import-articles";

const articleSchema = z.object({
  codeArticle: z.string().optional().nullable(),
  mpn: z.string().optional().nullable(),
  description: z.string().min(1),
  componentType: z.string().default("OTHER"),
  format: z.string().optional().nullable(),
  value: z.string().optional().nullable(),
  defaultUnitId: z.string().optional().nullable(),
  stockAlert: z.coerce.number().int().min(0).default(0),
  lastPurchasePrice: z.coerce.number().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function createArticle(raw: z.infer<typeof articleSchema>) {
  const u = await requirePermission("components.write");
  const d = parseOrThrow(articleSchema, raw);
  const code = d.codeArticle || (await nextArticleCode());
  const a = await prisma.article.create({
    data: {
      codeArticle: code,
      mpn: d.mpn || null,
      description: d.description,
      componentType: d.componentType,
      format: d.format || null,
      value: d.value || null,
      defaultUnitId: d.defaultUnitId || null,
      stockAlert: d.stockAlert,
      lastPurchasePrice: d.lastPurchasePrice ?? null,
      notes: d.notes || null,
    },
  });
  await audit({ userId: u.uid, action: "CREATE", entity: "Article", entityId: a.id });
  revalidatePath("/components");
  return { ok: true, id: a.id };
}

export async function updateArticle(id: string, raw: z.infer<typeof articleSchema>) {
  const u = await requirePermission("components.write");
  const d = parseOrThrow(articleSchema, raw);
  await prisma.article.update({
    where: { id },
    data: {
      mpn: d.mpn || null,
      description: d.description,
      componentType: d.componentType,
      format: d.format || null,
      value: d.value || null,
      defaultUnitId: d.defaultUnitId || null,
      stockAlert: d.stockAlert,
      lastPurchasePrice: d.lastPurchasePrice ?? null,
      notes: d.notes || null,
    },
  });
  await audit({ userId: u.uid, action: "UPDATE", entity: "Article", entityId: id });
  revalidatePath("/components");
  revalidatePath(`/components/${id}`);
  return { ok: true };
}

export async function deleteArticle(id: string) {
  const u = await requirePermission("components.write");
  await prisma.article.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit({ userId: u.uid, action: "DELETE", entity: "Article", entityId: id });
  revalidatePath("/components");
  return { ok: true };
}

// ArticleSupplier
const asSchema = z.object({
  articleId: z.string(),
  supplierId: z.string(),
  supplierRef: z.string().optional().nullable(),
  priceHT: z.coerce.number().min(0),
  currency: z.string().default("EUR"),
  moq: z.coerce.number().int().min(1).default(1),
  packaging: z.string().optional().nullable(),
  leadTimeDays: z.coerce.number().int().min(0).default(0),
  isPreferred: z.boolean().default(false),
});

export async function addArticleSupplier(raw: z.infer<typeof asSchema>) {
  const u = await requirePermission("components.write");
  const d = parseOrThrow(asSchema, raw);
  await prisma.$transaction(async (tx) => {
    if (d.isPreferred) {
      await tx.articleSupplier.updateMany({
        where: { articleId: d.articleId, isPreferred: true },
        data: { isPreferred: false },
      });
    }
    await tx.articleSupplier.create({
      data: {
        articleId: d.articleId,
        supplierId: d.supplierId,
        supplierRef: d.supplierRef || null,
        priceHT: d.priceHT,
        currency: d.currency,
        moq: d.moq,
        packaging: d.packaging || null,
        leadTimeDays: d.leadTimeDays,
        isPreferred: d.isPreferred,
      },
    });
  });
  await audit({ userId: u.uid, action: "CREATE", entity: "ArticleSupplier" });
  revalidatePath(`/components/${d.articleId}`);
  return { ok: true };
}

export async function deleteArticleSupplier(id: string, articleId: string) {
  const u = await requirePermission("components.write");
  await prisma.articleSupplier.delete({ where: { id } });
  await audit({ userId: u.uid, action: "DELETE", entity: "ArticleSupplier", entityId: id });
  revalidatePath(`/components/${articleId}`);
  return { ok: true };
}

// Equivalences
export async function addEquivalence(articleAId: string, articleBId: string, note?: string) {
  const u = await requirePermission("components.write");
  if (articleAId === articleBId) throw new Error("Articles identiques");
  const [a, b] = [articleAId, articleBId].sort();
  await prisma.articleEquivalence.upsert({
    where: { articleAId_articleBId: { articleAId: a, articleBId: b } },
    update: { note: note || null },
    create: { articleAId: a, articleBId: b, note: note || null },
  });
  await audit({ userId: u.uid, action: "CREATE", entity: "ArticleEquivalence" });
  revalidatePath(`/components/${articleAId}`);
  revalidatePath(`/components/${articleBId}`);
  return { ok: true };
}

export async function deleteEquivalence(id: string, articleId: string) {
  const u = await requirePermission("components.write");
  await prisma.articleEquivalence.delete({ where: { id } });
  await audit({ userId: u.uid, action: "DELETE", entity: "ArticleEquivalence", entityId: id });
  revalidatePath(`/components/${articleId}`);
  return { ok: true };
}

export async function uploadDatasheet(articleId: string, formData: FormData) {
  const u = await requirePermission("components.write");
  const file = formData.get("file") as File | null;
  if (!file) throw new Error("Fichier manquant");
  const buf = Buffer.from(await file.arrayBuffer());
  const saved = await saveFile({
    buffer: buf,
    originalName: file.name,
    mimeType: file.type || "application/pdf",
    subdir: "datasheets",
    uploadedBy: u.uid,
  });
  await prisma.article.update({ where: { id: articleId }, data: { datasheetFileId: saved.id } });
  await audit({ userId: u.uid, action: "UPLOAD_DATASHEET", entity: "Article", entityId: articleId });
  revalidatePath(`/components/${articleId}`);
  return { ok: true, fileId: saved.id };
}

/**
 * Import de composants en masse depuis un CSV ou JSON.
 * formData doit contenir `file` (File) et optionnellement `delimiter`.
 */
export async function importArticlesCsv(formData: FormData) {
  const u = await requirePermission("components.import");
  const file = formData.get("file") as File | null;
  const delimiter = (formData.get("delimiter") as string | null) || undefined;
  const overwriteExisting = formData.get("overwriteExisting") === "true" || formData.get("overwriteExisting") === "1";
  if (!file) throw new Error("Fichier manquant");
  if (file.size === 0) throw new Error("Fichier vide");

  const lower = file.name.toLowerCase();
  const type: "csv" | "json" = lower.endsWith(".json") ? "json" : "csv";

  const text = await file.text();
  const report = await importArticlesFromText(text, type, { delimiter, overwriteExisting });

  await audit({
    userId: u.uid,
    action: "IMPORT",
    entity: "Article",
    diff: {
      file: file.name,
      total: report.total,
      created: report.created,
      updated: report.updated,
      overwriteExisting,
      errors: report.errors.length,
    },
  });

  revalidatePath("/components");
  return { ok: true, report };
}
