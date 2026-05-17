import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { importArticlesFromText } from "@/lib/import-articles";

function parseMapping(raw: string | null | undefined): Record<string, string> | null {
  if (!raw) return null;
  try {
    const j = JSON.parse(raw);
    if (!j || typeof j !== "object") return null;
    const out: Record<string, string> = {};
    for (const k of Object.keys(j)) out[k] = String((j as Record<string, unknown>)[k]);
    return out;
  } catch {
    return null;
  }
}

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

async function moveFile(src: string, destDir: string, baseName: string): Promise<string> {
  await ensureDir(destDir);
  const ts = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace(/T/, "_")
    .slice(0, 19);
  const dest = path.join(destDir, `${ts}__${baseName}`);
  await fs.rename(src, dest);
  return dest;
}

function matchesType(file: string, type: string): boolean {
  const ext = path.extname(file).toLowerCase();
  if (type === "csv") return ext === ".csv" || ext === ".txt";
  if (type === "json") return ext === ".json";
  return false;
}

export type ScanSummary = {
  watchFolderId: string;
  scanned: number;
  imported: number;
  errored: number;
  ok: number;
  message: string;
};

/**
 * Scanne un dossier d'ecoute et importe tous les fichiers qu'il contient.
 * Retourne un resume. Met a jour WatchFolder.lastScanAt / lastResult et
 * cree des entrees WatchRun par fichier traite.
 */
export async function runWatchFolder(id: string): Promise<ScanSummary> {
  const wf = await prisma.watchFolder.findUnique({ where: { id } });
  if (!wf) {
    return { watchFolderId: id, scanned: 0, imported: 0, errored: 0, ok: 0, message: "Dossier introuvable" };
  }

  const baseDir = path.isAbsolute(wf.path) ? wf.path : path.resolve(process.cwd(), wf.path);

  try {
    await ensureDir(baseDir);
  } catch (e) {
    const msg = `Dossier inaccessible: ${(e as Error).message}`;
    await prisma.watchFolder.update({
      where: { id },
      data: { lastScanAt: new Date(), lastResult: msg },
    });
    return { watchFolderId: id, scanned: 0, imported: 0, errored: 0, ok: 0, message: msg };
  }

  const processedDir = path.join(baseDir, wf.processedSubdir);
  const errorDir = path.join(baseDir, wf.errorSubdir);

  let entries: string[] = [];
  try {
    const all = await fs.readdir(baseDir, { withFileTypes: true });
    entries = all
      .filter((d) => d.isFile())
      .map((d) => d.name)
      .filter((name) => !name.startsWith("."))
      .filter((name) => matchesType(name, wf.fileType));
  } catch (e) {
    const msg = `Lecture dossier: ${(e as Error).message}`;
    await prisma.watchFolder.update({
      where: { id },
      data: { lastScanAt: new Date(), lastResult: msg },
    });
    return { watchFolderId: id, scanned: 0, imported: 0, errored: 0, ok: 0, message: msg };
  }

  let imported = 0;
  let errored = 0;
  let ok = 0;
  const mapping = parseMapping(wf.fieldMapping);

  for (const name of entries) {
    const full = path.join(baseDir, name);
    try {
      const text = await fs.readFile(full, "utf8");

      if (wf.entity !== "article") {
        await moveFile(full, errorDir, name);
        await prisma.watchRun.create({
          data: {
            watchFolderId: id,
            file: name,
            status: "error",
            message: `Entite non supportee: ${wf.entity}`,
          },
        });
        errored++;
        continue;
      }

      const report = await importArticlesFromText(text, wf.fileType as "csv" | "json", {
        mapping,
        delimiter: wf.fileType === "csv" ? wf.csvDelimiter : undefined,
      });

      imported += report.created;

      const status = report.errors.length === 0 ? "success" : report.created > 0 ? "partial" : "error";
      if (status === "error") errored++;
      else ok++;

      const dest = status === "error" ? errorDir : processedDir;
      await moveFile(full, dest, name);

      const errorSnippet = report.errors
        .slice(0, 5)
        .map((e) => `L${e.line}: ${e.message}`)
        .join(" ; ");

      await prisma.watchRun.create({
        data: {
          watchFolderId: id,
          file: name,
          status,
          createdCount: report.created,
          errorCount: report.errors.length,
          message:
            report.errors.length === 0
              ? `${report.created}/${report.total} importes`
              : `${report.created}/${report.total} importes - ${report.errors.length} erreurs${errorSnippet ? " - " + errorSnippet : ""}`,
        },
      });
    } catch (e) {
      errored++;
      try {
        await moveFile(full, errorDir, name);
      } catch {
        // fichier probablement verrouille ou absent, on ignore
      }
      await prisma.watchRun.create({
        data: {
          watchFolderId: id,
          file: name,
          status: "error",
          message: (e as Error).message,
        },
      });
    }
  }

  const message = `${entries.length} fichier(s), ${imported} articles importes, ${ok} OK, ${errored} erreurs`;
  await prisma.watchFolder.update({
    where: { id },
    data: { lastScanAt: new Date(), lastResult: message },
  });

  return {
    watchFolderId: id,
    scanned: entries.length,
    imported,
    errored,
    ok,
    message,
  };
}
