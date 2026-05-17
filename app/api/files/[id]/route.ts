import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { readStoredFile } from "@/lib/upload";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const f = await readStoredFile(id);
  if (!f) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return new NextResponse(f.buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": f.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(f.name)}"`,
    },
  });
}
