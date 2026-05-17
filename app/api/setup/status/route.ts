import { NextResponse } from "next/server";
import { prisma, ensureWal } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await ensureWal();
  const cfg = await prisma.appConfig.findUnique({ where: { id: 1 } });
  return NextResponse.json({ initialized: !!cfg?.initialized });
}
