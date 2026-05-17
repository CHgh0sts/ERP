import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";

export async function saveFile(params: {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  subdir: "datasheets" | "logos" | "pdfs";
  uploadedBy?: string | null;
}): Promise<{ id: string; path: string }> {
  const hash = crypto.randomBytes(8).toString("hex");
  const ext = path.extname(params.originalName) || "";
  const safeName = `${Date.now()}-${hash}${ext}`;
  const storageDir = path.resolve(process.cwd(), "storage", params.subdir);
  await fs.mkdir(storageDir, { recursive: true });
  const full = path.join(storageDir, safeName);
  await fs.writeFile(full, params.buffer);
  const relative = path.relative(path.resolve(process.cwd(), "storage"), full).replaceAll("\\", "/");
  const stored = await prisma.storedFile.create({
    data: {
      originalName: params.originalName,
      mimeType: params.mimeType,
      size: params.buffer.length,
      path: relative,
      uploadedBy: params.uploadedBy ?? null,
    },
  });
  return { id: stored.id, path: relative };
}

export async function readStoredFile(id: string): Promise<{ buffer: Buffer; mimeType: string; name: string } | null> {
  const f = await prisma.storedFile.findUnique({ where: { id } });
  if (!f) return null;
  const full = path.resolve(process.cwd(), "storage", f.path);
  try {
    const buf = await fs.readFile(full);
    return { buffer: buf, mimeType: f.mimeType, name: f.originalName };
  } catch {
    return null;
  }
}
