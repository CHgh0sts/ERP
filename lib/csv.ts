/**
 * Parseur CSV minimaliste sans dependance externe.
 * - Supporte les guillemets (echappes par "")
 * - Detecte automatiquement le separateur (`,` ou `;` ou `\t`) si non fourni
 * - Ignore les lignes vides
 * - Normalise les en-tetes (trim, lowercase)
 */

export type CsvRow = Record<string, string>;

export function detectDelimiter(sample: string): "," | ";" | "\t" {
  const firstLine = sample.split(/\r?\n/, 1)[0] ?? "";
  const counts: Record<string, number> = {
    ",": (firstLine.match(/,/g) || []).length,
    ";": (firstLine.match(/;/g) || []).length,
    "\t": (firstLine.match(/\t/g) || []).length,
  };
  let best: "," | ";" | "\t" = ",";
  let bestCount = -1;
  (Object.keys(counts) as ("," | ";" | "\t")[]).forEach((k) => {
    if (counts[k] > bestCount) {
      bestCount = counts[k];
      best = k;
    }
  });
  return best;
}

function parseLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delim) {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
  }
  out.push(cur);
  return out;
}

export function parseCsv(text: string, delimiter?: string): { headers: string[]; rows: CsvRow[] } {
  const clean = text.replace(/^\uFEFF/, ""); // BOM
  const delim = delimiter ?? detectDelimiter(clean);
  const lines = clean.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const rawHeaders = parseLine(lines[0], delim).map((h) => h.trim());
  const headers = rawHeaders.map((h) => h.toLowerCase());

  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseLine(lines[i], delim);
    const row: CsvRow = {};
    headers.forEach((h, idx) => {
      row[h] = (cells[idx] ?? "").trim();
    });
    rows.push(row);
  }
  return { headers, rows };
}

export function parseJsonArray(text: string): CsvRow[] {
  const data = JSON.parse(text);
  if (!Array.isArray(data)) {
    if (data && typeof data === "object") return [data as CsvRow];
    throw new Error("Le JSON doit etre un tableau d'objets");
  }
  return data.map((r) => {
    const o: CsvRow = {};
    if (r && typeof r === "object") {
      for (const k of Object.keys(r)) {
        const v = (r as Record<string, unknown>)[k];
        o[k.toLowerCase()] = v == null ? "" : String(v);
      }
    }
    return o;
  });
}

/**
 * Applique un mapping (cibleInterne -> nomColonneSource) sur une ligne.
 * Si pas de mapping, la ligne est renvoyee telle quelle.
 */
export function applyMapping(row: CsvRow, mapping?: Record<string, string> | null): CsvRow {
  if (!mapping || Object.keys(mapping).length === 0) return row;
  const out: CsvRow = {};
  for (const target of Object.keys(mapping)) {
    const source = mapping[target].toLowerCase();
    out[target] = row[source] ?? "";
  }
  return out;
}
