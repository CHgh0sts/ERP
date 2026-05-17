import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { generateFEC } from "@/lib/accounting/fec";
import { format } from "date-fns";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!hasPermission(user, "accounting.fec.export")) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const fy = await prisma.fiscalYear.findUnique({ where: { id } });
  if (!fy) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const company = await prisma.company.findFirst();
  const siren = (company?.siret ?? "").replace(/\s/g, "").slice(0, 9) || "000000000";

  const content = await generateFEC(id);
  const filename = `${siren}FEC${format(fy.endDate, "yyyyMMdd")}.txt`;

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
