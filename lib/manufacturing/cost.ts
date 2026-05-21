import { prisma } from "@/lib/db";

export type CostSource =
  | "override"
  | "receipt"
  | "preferred_supplier"
  | "last_purchase"
  | "supplier_avg"
  | "none";

export const COST_SOURCE_LABELS: Record<CostSource, string> = {
  override: "Prix saisi sur l'OF",
  receipt: "Prix d'achat reel (reception)",
  preferred_supplier: "Fournisseur preferentiel",
  last_purchase: "Dernier prix d'achat",
  supplier_avg: "Moyenne fournisseurs",
  none: "Prix inconnu",
};

type ArticlePricing = {
  id: string;
  lastPurchasePrice: number | null;
  suppliers: { priceHT: number; isPreferred: boolean }[];
};

export function resolveArticleUnitCost(
  article: ArticlePricing,
  override?: number | null,
): { unitCostHT: number; source: CostSource } {
  if (override != null && override >= 0) {
    return { unitCostHT: override, source: "override" };
  }
  const preferred = article.suppliers.find((s) => s.isPreferred);
  if (preferred) {
    return { unitCostHT: preferred.priceHT, source: "preferred_supplier" };
  }
  if (article.lastPurchasePrice != null && article.lastPurchasePrice > 0) {
    return { unitCostHT: article.lastPurchasePrice, source: "last_purchase" };
  }
  if (article.suppliers.length > 0) {
    const avg = article.suppliers.reduce((s, x) => s + x.priceHT, 0) / article.suppliers.length;
    return { unitCostHT: avg, source: "supplier_avg" };
  }
  return { unitCostHT: 0, source: "none" };
}

export type OfCostLine = {
  reservationId: string;
  articleId: string;
  codeArticle: string;
  description: string;
  reference: string | null;
  notes: string | null;
  qtyNeeded: number;
  qtyConsumed: number;
  unitCostHT: number;
  source: CostSource;
  estimatedLineHT: number;
  actualLineHT: number | null;
};

export type OfCostSummary = {
  lines: OfCostLine[];
  estimatedComponentsHT: number;
  actualComponentsHT: number | null;
  laborCostHT: number;
  overheadCostHT: number;
  estimatedTotalHT: number;
  actualTotalHT: number | null;
  qty: number;
  estimatedUnitHT: number;
  actualUnitHT: number | null;
  productSalePriceHT: number | null;
  estimatedMarginHT: number | null;
  actualMarginHT: number | null;
  estimatedMarginPct: number | null;
  actualMarginPct: number | null;
  hasUnknownPrices: boolean;
};

function round6(n: number) {
  return Math.round(n * 1_000_000) / 1_000_000;
}

function marginPct(margin: number, sale: number): number | null {
  if (sale <= 0) return null;
  return round6((margin / sale) * 100);
}

/** Charge les donnees necessaires et calcule le cout estime / reel d'un OF. */
export async function computeOfCostSummary(ofId: string): Promise<OfCostSummary | null> {
  const of = await prisma.manufacturingOrder.findUnique({
    where: { id: ofId },
    include: {
      product: { select: { salePriceHT: true } },
      reservations: {
        include: {
          article: {
            include: { suppliers: { select: { priceHT: true, isPreferred: true } } },
          },
        },
        orderBy: { id: "asc" },
      },
      consumptions: {
        include: {
          stockUnit: {
            include: {
              supplierOrderLine: { select: { unitPriceHT: true } },
              article: {
                include: { suppliers: { select: { priceHT: true, isPreferred: true } } },
              },
            },
          },
        },
      },
    },
  });
  if (!of) return null;

  const actualByArticle = new Map<string, number>();
  let actualComponentsHT = 0;
  const hasActual = of.consumptions.length > 0;

  for (const c of of.consumptions) {
    const receiptPrice = c.stockUnit.supplierOrderLine?.unitPriceHT;
    const fallback = resolveArticleUnitCost(c.stockUnit.article);
    const unit =
      receiptPrice != null && receiptPrice > 0
        ? { unitCostHT: receiptPrice, source: "receipt" as CostSource }
        : fallback;
    actualComponentsHT += c.qty * unit.unitCostHT;
    actualByArticle.set(
      c.stockUnit.articleId,
      (actualByArticle.get(c.stockUnit.articleId) ?? 0) + c.qty * unit.unitCostHT,
    );
  }

  let estimatedComponentsHT = 0;
  let hasUnknownPrices = false;
  const lines: OfCostLine[] = of.reservations.map((res) => {
    const { unitCostHT, source } = resolveArticleUnitCost(res.article, res.unitCostHT);
    if (source === "none") hasUnknownPrices = true;
    const estimatedLineHT = res.qtyNeeded * unitCostHT;
    estimatedComponentsHT += estimatedLineHT;

    const articleActual = actualByArticle.get(res.articleId);
    let actualLineHT: number | null = null;
    if (hasActual && articleActual != null) {
      const totalArticleNeeded = of.reservations
        .filter((r) => r.articleId === res.articleId)
        .reduce((s, r) => s + r.qtyNeeded, 0);
      if (totalArticleNeeded > 0) {
        actualLineHT = (articleActual * res.qtyNeeded) / totalArticleNeeded;
      }
    }

    return {
      reservationId: res.id,
      articleId: res.articleId,
      codeArticle: res.article.codeArticle,
      description: res.article.description,
      reference: res.reference,
      notes: res.notes,
      qtyNeeded: res.qtyNeeded,
      qtyConsumed: res.qtyConsumed,
      unitCostHT,
      source,
      estimatedLineHT,
      actualLineHT,
    };
  });

  const laborCostHT = of.laborCostHT ?? 0;
  const overheadCostHT = of.overheadCostHT ?? 0;
  const estimatedTotalHT = estimatedComponentsHT + laborCostHT + overheadCostHT;
  const actualTotalHT = hasActual ? actualComponentsHT + laborCostHT + overheadCostHT : null;
  const qty = Math.max(1, of.qty);
  const productSalePriceHT = of.product.salePriceHT;
  const saleTotal = productSalePriceHT != null ? productSalePriceHT * qty : null;

  const estimatedMarginHT = saleTotal != null ? saleTotal - estimatedTotalHT : null;
  const actualMarginHT = saleTotal != null && actualTotalHT != null ? saleTotal - actualTotalHT : null;

  return {
    lines,
    estimatedComponentsHT: round6(estimatedComponentsHT),
    actualComponentsHT: hasActual ? round6(actualComponentsHT) : null,
    laborCostHT,
    overheadCostHT,
    estimatedTotalHT: round6(estimatedTotalHT),
    actualTotalHT: actualTotalHT != null ? round6(actualTotalHT) : null,
    qty,
    estimatedUnitHT: round6(estimatedTotalHT / qty),
    actualUnitHT: actualTotalHT != null ? round6(actualTotalHT / qty) : null,
    productSalePriceHT,
    estimatedMarginHT: estimatedMarginHT != null ? round6(estimatedMarginHT) : null,
    actualMarginHT: actualMarginHT != null ? round6(actualMarginHT) : null,
    estimatedMarginPct:
      estimatedMarginHT != null && saleTotal != null ? marginPct(estimatedMarginHT, saleTotal) : null,
    actualMarginPct: actualMarginHT != null && saleTotal != null ? marginPct(actualMarginHT, saleTotal) : null,
    hasUnknownPrices,
  };
}
