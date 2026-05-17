import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ stockUnitId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { stockUnitId } = await params;
  const u = await prisma.stockUnit.findUnique({ where: { id: stockUnitId }, include: { article: true } });
  if (!u) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const payload = JSON.stringify({
    codeUnique: u.codeUnique,
    codeArticle: u.article.codeArticle,
    description: u.article.description,
  });
  const png = await QRCode.toBuffer(payload, { width: 300, margin: 1 });
  return new NextResponse(png as unknown as BodyInit, {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `inline; filename="qr-${u.codeUnique}.png"`,
    },
  });
}
