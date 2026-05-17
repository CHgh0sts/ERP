import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

// Rate limit basique in-memory
const attempts = new Map<string, { count: number; at: number }>();
function checkRate(ip: string): boolean {
  const now = Date.now();
  const key = ip || "unknown";
  const rec = attempts.get(key);
  if (!rec || now - rec.at > 60_000) {
    attempts.set(key, { count: 1, at: now });
    return true;
  }
  rec.count++;
  rec.at = now;
  return rec.count <= 10;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "local";
  if (!checkRate(ip)) {
    return NextResponse.json({ error: "too_many_attempts" }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !user.isActive) {
    await audit({ action: "LOGIN_FAIL", entity: "User", diff: { email }, ip });
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    await audit({ userId: user.id, action: "LOGIN_FAIL", entity: "User", entityId: user.id, ip });
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }
  await createSession(user.id);
  await audit({ userId: user.id, action: "LOGIN", entity: "User", entityId: user.id, ip });
  return NextResponse.json({ ok: true });
}
