import { prisma } from "@/lib/db";
import { nextArticleCode } from "@/lib/codes";
import { applyMapping, parseCsv, parseJsonArray, type CsvRow } from "@/lib/csv";

export const ARTICLE_IMPORT_FIELDS = [
  "codearticle",
  "mpn",
  "description",
  "componenttype",
  "format",
  "value",
  "stockalert",
  "lastpurchaseprice",
  "notes",
] as const;

const TYPE_ALIASES: Record<string, string> = {
  resistor: "RESISTOR",
  resistance: "RESISTOR",
  capacitor: "CAPACITOR",
  condensateur: "CAPACITOR",
  inductor: "INDUCTOR",
  inductance: "INDUCTOR",
  ic: "IC",
  transistor: "TRANSISTOR",
  diode: "DIODE",
  connector: "CONNECTOR",
  connecteur: "CONNECTOR",
  pcb: "PCB",
  mechanical: "MECHANICAL",
  mecanique: "MECHANICAL",
  other: "OTHER",
  autre: "OTHER",
};

const VALID_TYPES = new Set([
  "RESISTOR",
  "CAPACITOR",
  "INDUCTOR",
  "IC",
  "TRANSISTOR",
  "DIODE",
  "CONNECTOR",
  "PCB",
  "MECHANICAL",
  "OTHER",
]);

export type ImportReport = {
  total: number;
  created: number;
  updated: number;
  errors: { line: number; mpn?: string; description?: string; message: string }[];
};

function num(v: string | undefined): number | null {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return n;
}

function normType(raw: string | undefined): string {
  if (!raw) return "OTHER";
  const t = raw.trim();
  if (VALID_TYPES.has(t.toUpperCase())) return t.toUpperCase();
  const a = TYPE_ALIASES[t.toLowerCase()];
  return a ?? "OTHER";
}

/**
 * Import d'un batch d'articles a partir de lignes CSV/JSON parsees.
 * Retourne un rapport: total, crees, erreurs ligne par ligne.
 * Cree les articles un par un (pas de transaction globale : on veut
 * importer autant que possible meme si quelques lignes sont invalides).
 */
export async function importArticleRows(
  rows: CsvRow[],
  opts: { mapping?: Record<string, string> | null; overwriteExisting?: boolean } = {},
): Promise<ImportReport> {
  const report: ImportReport = { total: rows.length, created: 0, updated: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const rawRow = rows[i];
    const r = applyMapping(rawRow, opts.mapping ?? null);
    const line = i + 2; // +1 header +1 index
    const description = (r.description ?? "").trim();

    if (!description) {
      report.errors.push({
        line,
        mpn: r.mpn,
        description,
        message: "Description obligatoire",
      });
      continue;
    }

    try {
      const code = (r.codearticle ?? "").trim() || (await nextArticleCode());

      const stockAlert = Math.max(0, Math.trunc(num(r.stockalert) ?? 0));
      const price = num(r.lastpurchaseprice);

      const articleData = {
        mpn: r.mpn?.trim() || null,
        description,
        componentType: normType(r.componenttype),
        format: r.format?.trim() || null,
        value: r.value?.trim() || null,
        stockAlert,
        lastPurchasePrice: price,
        notes: r.notes?.trim() || null,
      };

      const existing = await prisma.article.findFirst({
        where: { codeArticle: code },
        select: { id: true },
      });

      if (existing) {
        if (opts.overwriteExisting) {
          await prisma.article.update({
            where: { id: existing.id },
            data: { ...articleData, deletedAt: null },
          });
          report.updated++;
        } else {
          report.errors.push({
            line,
            mpn: r.mpn,
            description,
            message: `Code article deja utilise: ${code}`,
          });
        }
        continue;
      }

      await prisma.article.create({
        data: {
          codeArticle: code,
          ...articleData,
        },
      });
      report.created++;
    } catch (e) {
      report.errors.push({
        line,
        mpn: r.mpn,
        description,
        message: (e as Error).message,
      });
    }
  }

  return report;
}

export async function importArticlesFromText(
  text: string,
  type: "csv" | "json",
  opts: { mapping?: Record<string, string> | null; delimiter?: string; overwriteExisting?: boolean } = {},
): Promise<ImportReport> {
  let rows: CsvRow[];
  if (type === "csv") {
    rows = parseCsv(text, opts.delimiter).rows;
  } else {
    rows = parseJsonArray(text);
  }
  return importArticleRows(rows, { mapping: opts.mapping, overwriteExisting: opts.overwriteExisting });
}
