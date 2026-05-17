import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import archiver from "archiver";
import { getCurrentUser, hasPermission } from "@/lib/auth/session";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST() {
  const user = await getCurrentUser();
  if (!hasPermission(user, "admin.backup.manage")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { readable, writable } = new TransformStream<Uint8Array>();
  const writer = writable.getWriter();
  const archive = archiver("zip", { zlib: { level: 9 } });

  archive.on("data", (chunk) => {
    writer.write(new Uint8Array(chunk));
  });
  archive.on("end", () => writer.close());
  archive.on("error", (e) => writer.abort(e));

  const dbPath = path.resolve(process.cwd(), "data", "erp.db");
  if (fs.existsSync(dbPath)) archive.file(dbPath, { name: "data/erp.db" });
  const storageDir = path.resolve(process.cwd(), "storage");
  if (fs.existsSync(storageDir)) archive.directory(storageDir, "storage");

  archive.finalize();
  if (user) await audit({ userId: user.uid, action: "BACKUP", entity: "System" });

  return new NextResponse(readable as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="erp-backup.zip"`,
    },
  });
}
