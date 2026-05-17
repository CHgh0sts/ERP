"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { parseOrThrow } from "@/lib/zod-fr";
import { requirePermission } from "@/lib/auth/session";
import { audit } from "@/lib/audit";

const createSchema = z.object({
  code: z.string().min(2).regex(/^[A-Z0-9_]+$/),
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  permKeys: z.array(z.string()).default([]),
});

const updateSchema = z.object({
  id: z.string(),
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  permKeys: z.array(z.string()).default([]),
});

export async function createRoleAction(raw: z.infer<typeof createSchema>) {
  const u = await requirePermission("admin.roles.manage");
  const d = parseOrThrow(createSchema, raw);
  const perms = await prisma.permission.findMany({ where: { key: { in: d.permKeys } } });
  const role = await prisma.role.create({
    data: {
      code: d.code,
      name: d.name,
      description: d.description || null,
      permissions: { create: perms.map((p) => ({ permissionId: p.id })) },
    },
  });
  await audit({ userId: u.uid, action: "CREATE", entity: "Role", entityId: role.id, diff: d });
  revalidatePath("/admin/roles");
  return { ok: true };
}

export async function updateRoleAction(raw: z.infer<typeof updateSchema>) {
  const u = await requirePermission("admin.roles.manage");
  const d = parseOrThrow(updateSchema, raw);
  const existing = await prisma.role.findUnique({ where: { id: d.id } });
  if (!existing) throw new Error("Role introuvable");
  if (existing.code === "ADMIN") {
    // on empeche de modifier les permissions du role ADMIN (il doit tout avoir)
  }
  const perms = await prisma.permission.findMany({ where: { key: { in: d.permKeys } } });
  await prisma.$transaction(async (tx) => {
    await tx.role.update({
      where: { id: d.id },
      data: { name: d.name, description: d.description || null, version: { increment: 1 } },
    });
    if (existing.code !== "ADMIN") {
      await tx.rolePermission.deleteMany({ where: { roleId: d.id } });
      for (const p of perms) {
        await tx.rolePermission.create({ data: { roleId: d.id, permissionId: p.id } });
      }
    }
  });
  await audit({ userId: u.uid, action: "UPDATE", entity: "Role", entityId: d.id, diff: d });
  revalidatePath("/admin/roles");
  return { ok: true };
}

export async function deleteRoleAction(id: string) {
  const u = await requirePermission("admin.roles.manage");
  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) throw new Error("Role introuvable");
  if (role.isSystem) throw new Error("Role systeme non supprimable");
  await prisma.role.delete({ where: { id } });
  await audit({ userId: u.uid, action: "DELETE", entity: "Role", entityId: id });
  revalidatePath("/admin/roles");
  return { ok: true };
}
