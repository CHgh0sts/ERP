"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { parseOrThrow } from "@/lib/zod-fr";
import { audit } from "@/lib/audit";

const profileSchema = z.object({
  name: z.string().min(2),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Requis"),
    newPassword: z.string().min(8, "Minimum 8 caracteres"),
    confirmPassword: z.string().min(1, "Requis"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export async function updateProfile(raw: z.infer<typeof profileSchema>) {
  const u = await requireUser();
  const data = parseOrThrow(profileSchema, raw);

  await prisma.user.update({
    where: { id: u.uid },
    data: { name: data.name.trim() },
  });

  await audit({
    userId: u.uid,
    action: "UPDATE",
    entity: "User",
    entityId: u.uid,
    diff: { name: data.name.trim() },
  });

  revalidatePath("/account");
  return { ok: true };
}

export async function changeMyPassword(raw: z.infer<typeof passwordSchema>) {
  const u = await requireUser();
  const data = parseOrThrow(passwordSchema, raw);

  const user = await prisma.user.findUnique({ where: { id: u.uid } });
  if (!user) throw new Error("Utilisateur introuvable");

  const ok = await verifyPassword(data.currentPassword, user.passwordHash);
  if (!ok) throw new Error("Mot de passe actuel incorrect");

  const hash = await hashPassword(data.newPassword);

  await prisma.$transaction([
    prisma.user.update({ where: { id: u.uid }, data: { passwordHash: hash } }),
    // invalider les autres sessions eventuelles
    prisma.session.deleteMany({ where: { userId: u.uid } }),
  ]);

  await audit({
    userId: u.uid,
    action: "PASSWORD_CHANGE",
    entity: "User",
    entityId: u.uid,
  });

  return { ok: true };
}
