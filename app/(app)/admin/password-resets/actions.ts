"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { createResetToken, buildResetUrl } from "@/lib/auth/reset-token";
import { audit } from "@/lib/audit";

async function getBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function adminCreateResetLink(userId: string) {
  const admin = await requirePermission("admin.users.manage");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Utilisateur introuvable");
  if (!user.isActive) throw new Error("Compte desactive");

  const { token, expiresAt } = await createResetToken({
    userId,
    createdBy: admin.uid,
  });

  const base = await getBaseUrl();
  const url = buildResetUrl(base, token);

  await audit({
    userId: admin.uid,
    action: "PASSWORD_RESET_LINK_GENERATED",
    entity: "User",
    entityId: userId,
    diff: { target: user.email, byAdmin: true },
  });

  revalidatePath("/admin/password-resets");
  revalidatePath("/admin/users");

  return { url, expiresAt: expiresAt.toISOString(), email: user.email };
}

export async function adminRevokeResetToken(id: string) {
  const admin = await requirePermission("admin.users.manage");

  const rec = await prisma.passwordResetToken.findUnique({ where: { id } });
  if (!rec) return { ok: true };

  await prisma.passwordResetToken.update({
    where: { id },
    data: { expiresAt: new Date() },
  });

  await audit({
    userId: admin.uid,
    action: "PASSWORD_RESET_LINK_REVOKED",
    entity: "User",
    entityId: rec.userId,
  });

  revalidatePath("/admin/password-resets");
  return { ok: true };
}
