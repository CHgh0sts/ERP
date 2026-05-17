"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { parseOrThrow } from "@/lib/zod-fr";
import { requirePermission } from "@/lib/auth/session";
import { audit } from "@/lib/audit";

const schema = z.object({
  company: z.object({
    id: z.string(),
    name: z.string().min(1),
    siret: z.string().optional().nullable(),
    vatNumber: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    postalCode: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    country: z.string(),
    phone: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    currency: z.string(),
    fiscalYearStart: z.string(),
    fiscalYearEnd: z.string(),
  }),
  cfg: z.object({
    articleCodePrefix: z.string(),
    articleCodePadding: z.coerce.number().int().min(3).max(10),
    uniqueCodePrefix: z.string(),
    uniqueCodePadding: z.coerce.number().int().min(3).max(10),
    ofCodePrefix: z.string(),
    ofCodePadding: z.coerce.number().int().min(3).max(10),
    invoiceCodePrefix: z.string(),
    invoiceCodePadding: z.coerce.number().int().min(3).max(10),
    defaultStockAlert: z.coerce.number().int().min(0),
    timezone: z.string(),
    language: z.string(),
  }),
});

export async function saveSettings(raw: z.infer<typeof schema>) {
  const u = await requirePermission("admin.settings.manage");
  const d = parseOrThrow(schema, raw);
  await prisma.$transaction(async (tx) => {
    await tx.company.update({
      where: { id: d.company.id },
      data: {
        name: d.company.name,
        siret: d.company.siret || null,
        vatNumber: d.company.vatNumber || null,
        address: d.company.address || null,
        postalCode: d.company.postalCode || null,
        city: d.company.city || null,
        country: d.company.country,
        phone: d.company.phone || null,
        email: d.company.email || null,
        currency: d.company.currency,
        fiscalYearStart: new Date(d.company.fiscalYearStart),
        fiscalYearEnd: new Date(d.company.fiscalYearEnd),
      },
    });
    await tx.appConfig.update({ where: { id: 1 }, data: d.cfg });
  });
  await audit({ userId: u.uid, action: "UPDATE", entity: "AppConfig", entityId: "1", diff: d });
  revalidatePath("/admin/settings");
  return { ok: true };
}
