import jwt from "jsonwebtoken";
import { prisma } from "@/lib/db";

export type JwtPayload = {
  uid: string;
  email: string;
  name: string;
  roles: string[];
  perms: string[];
};

let cachedSecret: string | null = null;

export async function getJwtSecret(): Promise<string> {
  if (cachedSecret) return cachedSecret;
  const cfg = await prisma.appConfig.findUnique({ where: { id: 1 } });
  const secret = cfg?.jwtSecret || process.env.JWT_SECRET || "dev-fallback-secret";
  cachedSecret = secret;
  return secret;
}

export function invalidateSecretCache() {
  cachedSecret = null;
}

export async function signJwt(payload: JwtPayload): Promise<string> {
  const secret = await getJwtSecret();
  const expiresIn = (process.env.JWT_EXPIRES_IN || "12h") as jwt.SignOptions["expiresIn"];
  return jwt.sign(payload as object, secret, { expiresIn });
}

export async function verifyJwt(token: string): Promise<JwtPayload | null> {
  try {
    const secret = await getJwtSecret();
    return jwt.verify(token, secret) as JwtPayload;
  } catch {
    return null;
  }
}
