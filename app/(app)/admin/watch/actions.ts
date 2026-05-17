"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { parseOrThrow } from "@/lib/zod-fr";
import { refreshWatchScheduler, scanOne } from "@/lib/watch/scheduler";

const schema = z.object({
  name: z.string().min(1),
  path: z.string().min(1),
  fileType: z.enum(["csv", "json"]),
  entity: z.enum(["article"]),
  enabled: z.boolean().default(true),
  pollIntervalSec: z.coerce.number().int().min(5).default(60),
  csvDelimiter: z.string().min(1).max(3).default(","),
  fieldMapping: z.string().optional().nullable(),
  processedSubdir: z.string().min(1).default(".processed"),
  errorSubdir: z.string().min(1).default(".errors"),
});

function validateMapping(raw: string | null | undefined) {
  if (!raw || !raw.trim()) return null;
  try {
    const j = JSON.parse(raw);
    if (!j || typeof j !== "object" || Array.isArray(j)) {
      throw new Error("Le mapping doit etre un objet JSON (cle:valeur)");
    }
    return JSON.stringify(j);
  } catch (e) {
    throw new Error("Mapping JSON invalide: " + (e as Error).message);
  }
}

export async function createWatchFolder(raw: z.infer<typeof schema>) {
  const u = await requirePermission("admin.watch.manage");
  const d = parseOrThrow(schema, raw);
  const mapping = validateMapping(d.fieldMapping ?? null);
  const wf = await prisma.watchFolder.create({
    data: {
      name: d.name,
      path: d.path,
      fileType: d.fileType,
      entity: d.entity,
      enabled: d.enabled,
      pollIntervalSec: d.pollIntervalSec,
      csvDelimiter: d.csvDelimiter,
      fieldMapping: mapping,
      processedSubdir: d.processedSubdir,
      errorSubdir: d.errorSubdir,
    },
  });
  await audit({ userId: u.uid, action: "CREATE", entity: "WatchFolder", entityId: wf.id });
  await refreshWatchScheduler();
  revalidatePath("/admin/watch");
  return { ok: true, id: wf.id };
}

export async function updateWatchFolder(id: string, raw: z.infer<typeof schema>) {
  const u = await requirePermission("admin.watch.manage");
  const d = parseOrThrow(schema, raw);
  const mapping = validateMapping(d.fieldMapping ?? null);
  await prisma.watchFolder.update({
    where: { id },
    data: {
      name: d.name,
      path: d.path,
      fileType: d.fileType,
      entity: d.entity,
      enabled: d.enabled,
      pollIntervalSec: d.pollIntervalSec,
      csvDelimiter: d.csvDelimiter,
      fieldMapping: mapping,
      processedSubdir: d.processedSubdir,
      errorSubdir: d.errorSubdir,
    },
  });
  await audit({ userId: u.uid, action: "UPDATE", entity: "WatchFolder", entityId: id });
  await refreshWatchScheduler();
  revalidatePath("/admin/watch");
  return { ok: true };
}

export async function deleteWatchFolder(id: string) {
  const u = await requirePermission("admin.watch.manage");
  await prisma.watchFolder.delete({ where: { id } });
  await audit({ userId: u.uid, action: "DELETE", entity: "WatchFolder", entityId: id });
  await refreshWatchScheduler();
  revalidatePath("/admin/watch");
  return { ok: true };
}

export async function toggleWatchFolder(id: string, enabled: boolean) {
  const u = await requirePermission("admin.watch.manage");
  await prisma.watchFolder.update({ where: { id }, data: { enabled } });
  await audit({ userId: u.uid, action: enabled ? "ENABLE" : "DISABLE", entity: "WatchFolder", entityId: id });
  await refreshWatchScheduler();
  revalidatePath("/admin/watch");
  return { ok: true };
}

export async function scanWatchFolderNow(id: string) {
  const u = await requirePermission("admin.watch.manage");
  const summary = await scanOne(id);
  await audit({
    userId: u.uid,
    action: "SCAN",
    entity: "WatchFolder",
    entityId: id,
    diff: summary,
  });
  revalidatePath("/admin/watch");
  return { ok: true, summary };
}
