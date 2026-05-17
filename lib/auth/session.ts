import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { signJwt, verifyJwt, type JwtPayload } from "@/lib/auth/jwt";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import type { PermissionKey } from "@/lib/permissions/constants";

export const SESSION_COOKIE = "erp_session";

export async function loadUserWithPermissions(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: { include: { permission: true } },
            },
          },
        },
      },
    },
  });
  if (!user || !user.isActive) return null;
  const roles = user.roles.map((ur) => ur.role.code);
  const perms = Array.from(
    new Set(user.roles.flatMap((ur) => ur.role.permissions.map((rp) => rp.permission.key))),
  );
  return { user, roles, perms };
}

export async function createSession(userId: string): Promise<string> {
  const loaded = await loadUserWithPermissions(userId);
  if (!loaded) throw new Error("Utilisateur introuvable ou inactif");
  const payload: JwtPayload = {
    uid: loaded.user.id,
    email: loaded.user.email,
    name: loaded.user.name,
    roles: loaded.roles,
    perms: loaded.perms,
  };
  const token = await signJwt(payload);
  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
  await prisma.session.create({ data: { userId, token, expiresAt } });
  await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  return token;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } }).catch(() => {});
  }
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<JwtPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyJwt(token);
  if (!payload) return null;
  return payload;
}

export async function requireUser(): Promise<JwtPayload> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requirePermission(perm: PermissionKey): Promise<JwtPayload> {
  const user = await requireUser();
  if (!user.perms.includes(perm) && !user.roles.includes("ADMIN")) {
    redirect("/403");
  }
  return user;
}

export function hasPermission(user: JwtPayload | null, perm: PermissionKey): boolean {
  if (!user) return false;
  if (user.roles.includes("ADMIN")) return true;
  return user.perms.includes(perm);
}

export { hashPassword, verifyPassword };
