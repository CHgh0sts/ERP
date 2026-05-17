"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { parseOrThrow } from "@/lib/zod-fr";
import { requirePermission } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { audit } from "@/lib/audit";

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  roleIds: z.array(z.string()).default([]),
});

const updateSchema = z.object({
  id: z.string(),
  name: z.string().min(2),
  email: z.string().email(),
  isActive: z.boolean().default(true),
  password: z.string().min(8).optional().nullable(),
  roleIds: z.array(z.string()).default([]),
});

export async function createUserAction(raw: z.infer<typeof createSchema>) {
  const user = await requirePermission("admin.users.manage");
  const data = parseOrThrow(createSchema, raw);
  const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (existing) throw new Error("Email deja utilise");
  const passwordHash = await hashPassword(data.password);
  const created = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash,
      roles: { create: data.roleIds.map((roleId) => ({ roleId })) },
    },
  });
  await audit({ userId: user.uid, action: "CREATE", entity: "User", entityId: created.id });
  revalidatePath("/admin/users");
  return { ok: true, id: created.id };
}

export async function updateUserAction(raw: z.infer<typeof updateSchema>) {
  const user = await requirePermission("admin.users.manage");
  const data = parseOrThrow(updateSchema, raw);
  const dataUpdate: { name: string; email: string; isActive: boolean; passwordHash?: string } = {
    name: data.name,
    email: data.email.toLowerCase(),
    isActive: data.isActive,
  };
  if (data.password && data.password.length >= 8) {
    dataUpdate.passwordHash = await hashPassword(data.password);
  }
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: data.id }, data: dataUpdate });
    await tx.userRole.deleteMany({ where: { userId: data.id } });
    for (const roleId of data.roleIds) {
      await tx.userRole.create({ data: { userId: data.id, roleId } });
    }
  });
  await audit({ userId: user.uid, action: "UPDATE", entity: "User", entityId: data.id, diff: data });
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function deleteUserAction(id: string) {
  const user = await requirePermission("admin.users.manage");
  if (id === user.uid) throw new Error("Impossible de supprimer votre propre compte");
  await prisma.user.delete({ where: { id } });
  await audit({ userId: user.uid, action: "DELETE", entity: "User", entityId: id });
  revalidatePath("/admin/users");
  return { ok: true };
}
