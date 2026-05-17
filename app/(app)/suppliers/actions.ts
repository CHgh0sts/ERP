"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { parseOrThrow } from "@/lib/zod-fr";
import { requirePermission } from "@/lib/auth/session";
import { nextSimpleCode } from "@/lib/codes";
import { audit } from "@/lib/audit";

const schema = z.object({
  code: z.string().optional().nullable(),
  name: z.string().min(1),
  vatNumber: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().default("France"),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  paymentTerms: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  accountCode: z.string().optional().nullable(),
});

export async function createSupplier(raw: z.infer<typeof schema>) {
  const u = await requirePermission("suppliers.write");
  const d = parseOrThrow(schema, raw);
  const code = d.code || (await nextSimpleCode("supplier", "F", 4));
  const created = await prisma.supplier.create({
    data: {
      code,
      name: d.name,
      vatNumber: d.vatNumber || null,
      address: d.address || null,
      postalCode: d.postalCode || null,
      city: d.city || null,
      country: d.country,
      phone: d.phone || null,
      email: d.email || null,
      website: d.website || null,
      paymentTerms: d.paymentTerms || null,
      notes: d.notes || null,
      accountCode: d.accountCode || null,
    },
  });
  await audit({ userId: u.uid, action: "CREATE", entity: "Supplier", entityId: created.id });
  revalidatePath("/suppliers");
  return { ok: true, id: created.id };
}

export async function updateSupplier(id: string, raw: z.infer<typeof schema>) {
  const u = await requirePermission("suppliers.write");
  const d = parseOrThrow(schema, raw);
  await prisma.supplier.update({
    where: { id },
    data: {
      name: d.name,
      vatNumber: d.vatNumber || null,
      address: d.address || null,
      postalCode: d.postalCode || null,
      city: d.city || null,
      country: d.country,
      phone: d.phone || null,
      email: d.email || null,
      website: d.website || null,
      paymentTerms: d.paymentTerms || null,
      notes: d.notes || null,
      accountCode: d.accountCode || null,
    },
  });
  await audit({ userId: u.uid, action: "UPDATE", entity: "Supplier", entityId: id });
  revalidatePath("/suppliers");
  revalidatePath(`/suppliers/${id}`);
  return { ok: true };
}

export async function deleteSupplier(id: string) {
  const u = await requirePermission("suppliers.write");
  await prisma.supplier.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit({ userId: u.uid, action: "DELETE", entity: "Supplier", entityId: id });
  revalidatePath("/suppliers");
  return { ok: true };
}
