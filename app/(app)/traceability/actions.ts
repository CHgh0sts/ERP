"use server";

import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";

export type TimelineEvent = {
  at: string;
  type: string;
  label: string;
  detail?: string;
  ref?: { kind: "article" | "stock" | "of" | "customerOrder" | "supplierOrder"; id: string };
};

export async function searchTraceability(term: string) {
  await requirePermission("traceability.read");
  const q = term.trim();
  if (!q) return { type: "empty" as const };

  // Essai code unique stock
  const su = await prisma.stockUnit.findUnique({
    where: { codeUnique: q },
    include: {
      article: true,
      location: true,
      supplierOrderLine: {
        include: {
          order: { include: { supplier: true } },
          articleSupplier: true,
        },
      },
      movements: { orderBy: { at: "asc" } },
      consumptions: {
        orderBy: { at: "asc" },
        include: {
          manufacturingOrder: {
            include: {
              product: true,
              customerOrder: { include: { customer: true, invoices: true } },
            },
          },
        },
      },
    },
  });
  if (su) {
    return { type: "stockUnit" as const, data: await buildStockTimeline(su) };
  }

  // Code commande client
  const co = await prisma.customerOrder.findUnique({
    where: { code: q },
    include: {
      customer: true,
      lines: { include: { product: true } },
      manufacturingOrders: {
        include: {
          bom: true,
          product: true,
          consumptions: {
            include: {
              stockUnit: {
                include: {
                  article: true,
                  supplierOrderLine: { include: { order: { include: { supplier: true } } } },
                },
              },
            },
          },
        },
      },
      invoices: true,
    },
  });
  if (co) {
    return { type: "customerOrder" as const, data: buildCustomerOrderTimeline(co) };
  }

  // Code OF
  const of = await prisma.manufacturingOrder.findUnique({
    where: { code: q },
    include: {
      product: true,
      bom: true,
      customerOrder: { include: { customer: true } },
      consumptions: {
        include: {
          stockUnit: { include: { article: true, supplierOrderLine: { include: { order: { include: { supplier: true } } } } } },
        },
      },
    },
  });
  if (of) {
    return { type: "manufacturingOrder" as const, data: buildOfTimeline(of) };
  }

  // Code article
  const art = await prisma.article.findUnique({
    where: { codeArticle: q },
    include: { stockUnits: { include: { location: true }, take: 20, orderBy: { createdAt: "desc" } } },
  });
  if (art) {
    return { type: "article" as const, data: art };
  }

  return { type: "not_found" as const };
}

type SUWithRels = Awaited<ReturnType<typeof prisma.stockUnit.findUnique>>;

async function buildStockTimeline(su: NonNullable<Awaited<ReturnType<typeof loadStockUnit>>>) {
  const events: TimelineEvent[] = [];
  if (su.supplierOrderLine) {
    events.push({
      at: su.supplierOrderLine.order.orderDate.toISOString(),
      type: "ORDER",
      label: `Commande fournisseur ${su.supplierOrderLine.order.code}`,
      detail: su.supplierOrderLine.order.supplier.name,
      ref: { kind: "supplierOrder", id: su.supplierOrderLine.order.id },
    });
  }
  if (su.receivedAt) {
    events.push({
      at: su.receivedAt.toISOString(),
      type: "RECEPTION",
      label: `Reception en stock - ${su.article.codeArticle}`,
      detail: `Emplacement ${su.location?.name ?? "-"}${su.lotNumber ? ", lot " + su.lotNumber : ""}`,
      ref: { kind: "stock", id: su.id },
    });
  }
  for (const m of su.movements) {
    events.push({
      at: m.at.toISOString(),
      type: m.type,
      label: `Mouvement ${m.type}`,
      detail: `${m.qty} - ${m.reason ?? ""}`,
    });
  }
  for (const c of su.consumptions) {
    events.push({
      at: c.at.toISOString(),
      type: "CONSUMPTION",
      label: `Consommation OF ${c.manufacturingOrder.code}`,
      detail: `Produit ${c.manufacturingOrder.product.name} - qte ${c.qty}`,
      ref: { kind: "of", id: c.ofId },
    });
    if (c.manufacturingOrder.customerOrder) {
      const cco = c.manufacturingOrder.customerOrder;
      events.push({
        at: cco.orderDate.toISOString(),
        type: "CUSTOMER_ORDER",
        label: `Commande client ${cco.code}`,
        detail: cco.customer.name,
        ref: { kind: "customerOrder", id: cco.id },
      });
      for (const inv of cco.invoices) {
        events.push({
          at: inv.issueDate.toISOString(),
          type: "INVOICE",
          label: `Facture ${inv.code}`,
          detail: `${inv.status}`,
        });
      }
    }
  }
  events.sort((a, b) => (a.at < b.at ? -1 : 1));
  return {
    header: {
      codeUnique: su.codeUnique,
      article: `${su.article.codeArticle} - ${su.article.description}`,
      qtyOnHand: su.qtyOnHand,
      qtyReserved: su.qtyReserved,
      location: su.location?.name ?? null,
      lotNumber: su.lotNumber,
    },
    events,
  };
}

async function loadStockUnit(id: string) {
  return prisma.stockUnit.findUnique({
    where: { id },
    include: {
      article: true,
      location: true,
      supplierOrderLine: { include: { order: { include: { supplier: true } } } },
      movements: { orderBy: { at: "asc" } },
      consumptions: {
        orderBy: { at: "asc" },
        include: {
          manufacturingOrder: {
            include: {
              product: true,
              customerOrder: { include: { customer: true, invoices: true } },
            },
          },
        },
      },
    },
  });
}

function buildCustomerOrderTimeline(
  co: NonNullable<Awaited<ReturnType<typeof loadCustomerOrder>>>,
) {
  const events: TimelineEvent[] = [];
  events.push({
    at: co.orderDate.toISOString(),
    type: "ORDER",
    label: `Commande client ${co.code}`,
    detail: co.customer.name,
  });
  for (const of of co.manufacturingOrders) {
    events.push({
      at: of.createdAt.toISOString(),
      type: "OF_CREATED",
      label: `OF ${of.code} cree`,
      detail: `${of.product.name} - qte ${of.qty}`,
      ref: { kind: "of", id: of.id },
    });
    if (of.startedAt) {
      events.push({
        at: of.startedAt.toISOString(),
        type: "OF_STARTED",
        label: `OF ${of.code} demarre`,
      });
    }
    for (const c of of.consumptions) {
      events.push({
        at: c.at.toISOString(),
        type: "CONSUMPTION",
        label: `Consommation ${c.stockUnit.article.codeArticle}`,
        detail: `Unite ${c.stockUnit.codeUnique}${
          c.stockUnit.supplierOrderLine?.order
            ? " (achat " + c.stockUnit.supplierOrderLine.order.code + " / " + c.stockUnit.supplierOrderLine.order.supplier.name + ")"
            : ""
        } qte ${c.qty}`,
        ref: { kind: "stock", id: c.stockUnit.id },
      });
    }
    if (of.completedAt) {
      events.push({
        at: of.completedAt.toISOString(),
        type: "OF_DONE",
        label: `OF ${of.code} termine`,
      });
    }
  }
  for (const inv of co.invoices) {
    events.push({
      at: inv.issueDate.toISOString(),
      type: "INVOICE",
      label: `Facture ${inv.code}`,
      detail: `${inv.status}`,
    });
  }
  events.sort((a, b) => (a.at < b.at ? -1 : 1));
  return {
    header: {
      code: co.code,
      customer: co.customer.name,
      status: co.status,
      lines: co.lines.map((l) => ({ product: l.product.name, qty: l.qty })),
    },
    events,
  };
}

async function loadCustomerOrder(id: string) {
  return prisma.customerOrder.findUnique({
    where: { id },
    include: {
      customer: true,
      lines: { include: { product: true } },
      manufacturingOrders: {
        include: {
          bom: true,
          product: true,
          consumptions: {
            include: {
              stockUnit: { include: { article: true, supplierOrderLine: { include: { order: { include: { supplier: true } } } } } },
            },
          },
        },
      },
      invoices: true,
    },
  });
}

function buildOfTimeline(of: NonNullable<Awaited<ReturnType<typeof loadOf>>>) {
  const events: TimelineEvent[] = [];
  events.push({
    at: of.createdAt.toISOString(),
    type: "OF_CREATED",
    label: `OF ${of.code} cree`,
    detail: `${of.product.name} - qte ${of.qty}`,
  });
  if (of.customerOrder) {
    events.push({
      at: of.customerOrder.orderDate.toISOString(),
      type: "CUSTOMER_ORDER",
      label: `Commande client ${of.customerOrder.code}`,
      detail: of.customerOrder.customer.name,
      ref: { kind: "customerOrder", id: of.customerOrder.id },
    });
  }
  if (of.startedAt) events.push({ at: of.startedAt.toISOString(), type: "OF_STARTED", label: "Demarrage" });
  for (const c of of.consumptions) {
    events.push({
      at: c.at.toISOString(),
      type: "CONSUMPTION",
      label: `Consommation ${c.stockUnit.article.codeArticle}`,
      detail: `Unite ${c.stockUnit.codeUnique}${
        c.stockUnit.supplierOrderLine?.order
          ? " (achat " + c.stockUnit.supplierOrderLine.order.code + " / " + c.stockUnit.supplierOrderLine.order.supplier.name + ")"
          : ""
      } qte ${c.qty}`,
      ref: { kind: "stock", id: c.stockUnit.id },
    });
  }
  if (of.completedAt) events.push({ at: of.completedAt.toISOString(), type: "OF_DONE", label: "Termine" });
  events.sort((a, b) => (a.at < b.at ? -1 : 1));
  return {
    header: {
      code: of.code,
      product: of.product.name,
      bomVersion: of.bom.version,
      qty: of.qty,
      status: of.status,
      customerOrder: of.customerOrder?.code ?? null,
    },
    events,
  };
}

async function loadOf(id: string) {
  return prisma.manufacturingOrder.findUnique({
    where: { id },
    include: {
      product: true,
      bom: true,
      customerOrder: { include: { customer: true } },
      consumptions: {
        include: {
          stockUnit: { include: { article: true, supplierOrderLine: { include: { order: { include: { supplier: true } } } } } },
        },
      },
    },
  });
}
