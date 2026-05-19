"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { parseOrThrow } from "@/lib/zod-fr";
import { requirePermission } from "@/lib/auth/session";
import { nextInvoiceCode } from "@/lib/codes";
import { audit } from "@/lib/audit";
import { postEntry } from "@/lib/accounting/journals";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

const saleSchema = z.object({
  customerId: z.string(),
  customerOrderId: z.string().optional().nullable(),
  issueDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  lines: z.array(
    z.object({
      description: z.string().min(1),
      qty: z.coerce.number().min(0.001),
      unitPriceHT: z.coerce.number().min(0),
      vatRateId: z.string().optional().nullable(),
    }),
  ),
});

export async function createSaleInvoice(raw: z.infer<typeof saleSchema>) {
  const u = await requirePermission("invoices.write");
  const d = parseOrThrow(saleSchema, raw);
  if (d.lines.length === 0) throw new Error("Ajoutez au moins une ligne");

  const vatRates = await prisma.vatRate.findMany();
  const rateMap = new Map(vatRates.map((v) => [v.id, v.rate]));

  const totalHT = d.lines.reduce((s, l) => s + l.qty * l.unitPriceHT, 0);
  const totalVat = d.lines.reduce((s, l) => {
    const r = l.vatRateId ? rateMap.get(l.vatRateId) ?? 0 : 0;
    return s + l.qty * l.unitPriceHT * (r / 100);
  }, 0);

  const code = await nextInvoiceCode();
  const inv = await prisma.invoice.create({
    data: {
      code,
      type: "SALE",
      customerId: d.customerId,
      customerOrderId: d.customerOrderId || null,
      issueDate: d.issueDate ? new Date(d.issueDate) : new Date(),
      dueDate: d.dueDate ? new Date(d.dueDate) : null,
      status: "DRAFT",
      totalHT: round2(totalHT),
      totalVat: round2(totalVat),
      totalTTC: round2(totalHT + totalVat),
      notes: d.notes || null,
      lines: {
        create: d.lines.map((l) => ({
          description: l.description,
          qty: l.qty,
          unitPriceHT: l.unitPriceHT,
          vatRateId: l.vatRateId || null,
        })),
      },
    },
  });
  await audit({ userId: u.uid, action: "CREATE", entity: "Invoice", entityId: inv.id });
  revalidatePath("/invoices");
  return { ok: true, id: inv.id };
}

const purchaseSchema = z.object({
  supplierId: z.string(),
  supplierOrderId: z.string().optional().nullable(),
  issueDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  lines: z.array(
    z.object({
      description: z.string().min(1),
      qty: z.coerce.number().min(0.001),
      unitPriceHT: z.coerce.number().min(0),
      vatRateId: z.string().optional().nullable(),
    }),
  ),
});

export async function createPurchaseInvoice(raw: z.infer<typeof purchaseSchema>) {
  const u = await requirePermission("invoices.write");
  const d = parseOrThrow(purchaseSchema, raw);
  if (d.lines.length === 0) throw new Error("Ajoutez au moins une ligne");

  const vatRates = await prisma.vatRate.findMany();
  const rateMap = new Map(vatRates.map((v) => [v.id, v.rate]));

  const totalHT = d.lines.reduce((s, l) => s + l.qty * l.unitPriceHT, 0);
  const totalVat = d.lines.reduce((s, l) => {
    const r = l.vatRateId ? rateMap.get(l.vatRateId) ?? 0 : 0;
    return s + l.qty * l.unitPriceHT * (r / 100);
  }, 0);

  const code = await nextInvoiceCode();
  const inv = await prisma.invoice.create({
    data: {
      code,
      type: "PURCHASE",
      supplierId: d.supplierId,
      supplierOrderId: d.supplierOrderId || null,
      issueDate: d.issueDate ? new Date(d.issueDate) : new Date(),
      dueDate: d.dueDate ? new Date(d.dueDate) : null,
      status: "DRAFT",
      totalHT: round2(totalHT),
      totalVat: round2(totalVat),
      totalTTC: round2(totalHT + totalVat),
      notes: d.notes || null,
      lines: {
        create: d.lines.map((l) => ({
          description: l.description,
          qty: l.qty,
          unitPriceHT: l.unitPriceHT,
          vatRateId: l.vatRateId || null,
        })),
      },
    },
  });
  await audit({ userId: u.uid, action: "CREATE", entity: "Invoice", entityId: inv.id });
  revalidatePath("/invoices");
  return { ok: true, id: inv.id };
}

export async function issueInvoice(id: string) {
  const u = await requirePermission("invoices.write");

  await prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.findUnique({
      where: { id },
      include: {
        lines: { include: { vatRate: true } },
        customer: true,
        supplier: true,
      },
    });
    if (!inv) throw new Error("Facture introuvable");
    if (inv.status !== "DRAFT") throw new Error("Facture deja emise");

    let entryId: string;
    if (inv.type === "SALE") {
      // VE : debit 411 TTC, credit 707 HT, credit 44571 TVA
      const vatMap = new Map<number, number>();
      for (const l of inv.lines) {
        const r = l.vatRate?.rate ?? 0;
        vatMap.set(r, (vatMap.get(r) || 0) + l.qty * l.unitPriceHT);
      }
      const vatLines: { accountNumber: string; credit: number; label: string }[] = [];
      for (const [rate, baseHT] of vatMap) {
        if (rate > 0) {
          vatLines.push({
            accountNumber: "44571",
            credit: round2(baseHT * (rate / 100)),
            label: `TVA collectee ${rate}%`,
          });
        }
      }
      entryId = await postEntry({
        journalCode: "VE",
        date: inv.issueDate,
        pieceRef: inv.code,
        label: `Facture ${inv.code} - ${inv.customer?.name ?? ""}`,
        lines: [
          { accountNumber: "411", debit: round2(inv.totalTTC), label: inv.customer?.name ?? "" },
          { accountNumber: "707", credit: round2(inv.totalHT), label: "Ventes" },
          ...vatLines,
        ],
        tx,
      });
    } else {
      // PURCHASE : debit 607 HT + 44566 TVA, credit 401 TTC
      entryId = await postEntry({
        journalCode: "AC",
        date: inv.issueDate,
        pieceRef: inv.code,
        label: `Facture achat ${inv.code} - ${inv.supplier?.name ?? ""}`,
        lines: [
          { accountNumber: "607", debit: round2(inv.totalHT), label: "Achats" },
          ...(inv.totalVat > 0.005 ? [{ accountNumber: "44566", debit: round2(inv.totalVat), label: "TVA deductible" }] : []),
          { accountNumber: "401", credit: round2(inv.totalTTC), label: inv.supplier?.name ?? "" },
        ],
        tx,
      });
    }

    await tx.invoice.update({
      where: { id },
      data: { status: "ISSUED", journalEntryId: entryId },
    });

    if (inv.type === "SALE" && inv.customerOrderId) {
      await tx.customerOrder.update({ where: { id: inv.customerOrderId }, data: { status: "INVOICED" } });
    }
  });

  await audit({ userId: u.uid, action: "ISSUE", entity: "Invoice", entityId: id });
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/invoices");
  return { ok: true };
}

const paymentSchema = z.object({
  invoiceId: z.string(),
  amount: z.coerce.number().min(0.01),
  method: z.string(),
  at: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),
});

export async function addPayment(raw: z.infer<typeof paymentSchema>) {
  const u = await requirePermission("payments.manage");
  const d = parseOrThrow(paymentSchema, raw);

  await prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.findUnique({
      where: { id: d.invoiceId },
      include: { payments: true, customer: true, supplier: true },
    });
    if (!inv) throw new Error("Facture introuvable");
    if (inv.status === "DRAFT") throw new Error("Emettez d'abord la facture");
    if (inv.status === "CANCELLED") throw new Error("Facture annulee");

    const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
    const remaining = round2(inv.totalTTC - paid);
    if (d.amount > remaining + 0.005) throw new Error(`Montant superieur au reste a payer (${remaining})`);

    const at = d.at ? new Date(d.at) : new Date();

    // BQ : debit 512 / credit 411 (ventes)  |  debit 401 / credit 512 (achats)
    let entryId: string;
    if (inv.type === "SALE") {
      entryId = await postEntry({
        journalCode: "BQ",
        date: at,
        pieceRef: `PAY-${inv.code}`,
        label: `Paiement ${inv.code} - ${inv.customer?.name ?? ""}`,
        lines: [
          { accountNumber: "512", debit: round2(d.amount), label: d.method },
          { accountNumber: "411", credit: round2(d.amount), label: inv.customer?.name ?? "" },
        ],
        tx,
      });
    } else {
      entryId = await postEntry({
        journalCode: "BQ",
        date: at,
        pieceRef: `PAY-${inv.code}`,
        label: `Paiement ${inv.code} - ${inv.supplier?.name ?? ""}`,
        lines: [
          { accountNumber: "401", debit: round2(d.amount), label: inv.supplier?.name ?? "" },
          { accountNumber: "512", credit: round2(d.amount), label: d.method },
        ],
        tx,
      });
    }

    await tx.payment.create({
      data: {
        invoiceId: inv.id,
        amount: d.amount,
        method: d.method,
        at,
        reference: d.reference || null,
        journalEntryId: entryId,
      },
    });

    const newPaid = paid + d.amount;
    const status = newPaid + 0.005 >= inv.totalTTC ? "PAID" : "PARTIAL";
    await tx.invoice.update({ where: { id: inv.id }, data: { status } });
  });

  await audit({ userId: u.uid, action: "PAYMENT", entity: "Invoice", entityId: d.invoiceId });
  revalidatePath(`/invoices/${d.invoiceId}`);
  return { ok: true };
}

export async function cancelInvoice(id: string) {
  const u = await requirePermission("invoices.write");
  const inv = await prisma.invoice.findUnique({ where: { id }, include: { payments: true } });
  if (!inv) throw new Error("Facture introuvable");
  if (inv.payments.length > 0) throw new Error("Facture avec paiements, annulation impossible");
  if (inv.status === "DRAFT") {
    await prisma.invoice.delete({ where: { id } });
  } else {
    await prisma.invoice.update({ where: { id }, data: { status: "CANCELLED" } });
  }
  await audit({ userId: u.uid, action: "CANCEL", entity: "Invoice", entityId: id });
  revalidatePath("/invoices");
  return { ok: true };
}

export async function getInvoiceFormData() {
  await requirePermission("invoices.read");
  const [customers, suppliers, vatRates, customerOrders, supplierOrders] = await Promise.all([
    prisma.customer.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
    prisma.supplier.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
    prisma.vatRate.findMany({ orderBy: { rate: "desc" } }),
    prisma.customerOrder.findMany({
      where: { status: { notIn: ["CANCELLED", "INVOICED"] } },
      include: { customer: true, lines: { include: { product: true, vatRate: true } } },
      orderBy: { orderDate: "desc" },
    }),
    prisma.supplierOrder.findMany({
      where: { status: { notIn: ["CANCELLED", "DRAFT"] } },
      include: {
        supplier: true,
        lines: { include: { articleSupplier: { include: { article: true } } } },
      },
      orderBy: { orderDate: "desc" },
    }),
  ]);
  return {
    customers: customers.map((c) => ({ id: c.id, name: c.name })),
    suppliers: suppliers.map((s) => ({ id: s.id, name: s.name })),
    vatRates: vatRates.map((v) => ({
      id: v.id,
      code: v.code,
      rate: v.rate,
      isDefault: v.isDefault,
    })),
    customerOrders: customerOrders.map((o) => ({
      id: o.id,
      code: o.code,
      customerId: o.customerId,
      customerName: o.customer.name,
      lines: o.lines.map((l) => ({
        description: `${l.product.code} - ${l.product.name}${l.description ? " - " + l.description : ""}`,
        qty: l.qty,
        unitPriceHT: l.unitPriceHT,
        vatRateId: l.vatRateId,
      })),
    })),
    supplierOrders: supplierOrders.map((o) => ({
      id: o.id,
      code: o.code,
      supplierId: o.supplierId,
      supplierName: o.supplier.name,
      lines: o.lines.map((l) => ({
        description: `${l.articleSupplier.article.codeArticle} - ${l.articleSupplier.article.description}`,
        qty: l.qtyReceived > 0 ? l.qtyReceived : l.qtyOrdered,
        unitPriceHT: l.unitPriceHT,
        vatRateCode: l.vatRateCode,
      })),
    })),
  };
}
