import { NextResponse } from "next/server";
import { destroySession, getCurrentUser } from "@/lib/auth/session";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST() {
  const user = await getCurrentUser();
  await destroySession();
  if (user) await audit({ userId: user.uid, action: "LOGOUT", entity: "User", entityId: user.uid });
  return NextResponse.json({ ok: true });
}
