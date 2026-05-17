import crypto from "crypto";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";

const RESET_TOKEN_TTL_MINUTES = 60;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateResetToken(): { token: string; tokenHash: string; expiresAt: Date } {
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);
  return { token, tokenHash, expiresAt };
}

/** Cree un token de reset pour un user (invalide les anciens non-utilises). */
export async function createResetToken(params: {
  userId: string;
  createdBy?: string | null;
  requestedIp?: string | null;
}) {
  const { token, tokenHash, expiresAt } = generateResetToken();

  await prisma.passwordResetToken.updateMany({
    where: { userId: params.userId, usedAt: null, expiresAt: { gt: new Date() } },
    data: { expiresAt: new Date() },
  });

  const record = await prisma.passwordResetToken.create({
    data: {
      userId: params.userId,
      tokenHash,
      expiresAt,
      createdBy: params.createdBy ?? null,
      requestedIp: params.requestedIp ?? null,
    },
  });

  return { token, expiresAt, id: record.id };
}

export function buildResetUrl(baseUrl: string, token: string): string {
  const b = baseUrl.replace(/\/$/, "");
  return `${b}/reset-password/${token}`;
}

export async function findValidToken(token: string) {
  const tokenHash = hashToken(token);
  const rec = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  if (!rec) return null;
  if (rec.usedAt) return null;
  if (rec.expiresAt < new Date()) return null;
  if (!rec.user.isActive) return null;
  return rec;
}

/**
 * Consomme un token et met a jour le mot de passe.
 * Invalide toutes les sessions actives de l'utilisateur.
 */
export async function consumeResetToken(token: string, newPassword: string) {
  const rec = await findValidToken(token);
  if (!rec) throw new Error("Lien invalide ou expire");

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: rec.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: rec.id },
      data: { usedAt: new Date() },
    }),
    prisma.session.deleteMany({ where: { userId: rec.userId } }),
  ]);

  return { userId: rec.userId };
}

export async function purgeExpiredResetTokens() {
  try {
    await prisma.passwordResetToken.deleteMany({
      where: { OR: [{ expiresAt: { lt: new Date() } }, { usedAt: { not: null } }] },
    });
  } catch {
    // silent
  }
}
