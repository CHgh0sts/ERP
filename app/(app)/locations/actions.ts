"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { parseOrThrow } from "@/lib/zod-fr";
import { requirePermission } from "@/lib/auth/session";
import { audit } from "@/lib/audit";

const schema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
});

export async function createLocation(raw: z.infer<typeof schema>) {
  const u = await requirePermission("locations.write");
  const d = parseOrThrow(schema, raw);
  const created = await prisma.location.create({
    data: { code: d.code, name: d.name, description: d.description || null, parentId: d.parentId || null },
  });
  await audit({ userId: u.uid, action: "CREATE", entity: "Location", entityId: created.id });
  revalidatePath("/locations");
  return { ok: true };
}

export async function updateLocation(id: string, raw: z.infer<typeof schema>) {
  const u = await requirePermission("locations.write");
  const d = parseOrThrow(schema, raw);
  await prisma.location.update({
    where: { id },
    data: { code: d.code, name: d.name, description: d.description || null, parentId: d.parentId || null },
  });
  await audit({ userId: u.uid, action: "UPDATE", entity: "Location", entityId: id });
  revalidatePath("/locations");
  return { ok: true };
}

export async function deleteLocation(id: string) {
  const u = await requirePermission("locations.write");
  await prisma.location.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit({ userId: u.uid, action: "DELETE", entity: "Location", entityId: id });
  revalidatePath("/locations");
  return { ok: true };
}
