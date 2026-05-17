"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { parseOrThrow } from "@/lib/zod-fr";
import { requirePermission } from "@/lib/auth/session";
import { nextSimpleCode } from "@/lib/codes";
import { audit } from "@/lib/audit";

const createSchema = z.object({
  customerId: z.string(),
  dueDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  lines: z.array(
    z.object({
      productId: z.string(),
      qty: z.coerce.number().int().min(1),
      unitPriceHT: z.coerce.number().min(0),
      vatRateId: z.string().optional().nullable(),
      description: z.string().optional().nullable(),
    }),
  ),
});

export async function createCustomerOrder(raw: z.infer<typeof createSchema>) {
  const u = await requirePermission("sales.write");
  const d = parseOrThrow(createSchema, raw);
  if (d.lines.length === 0) throw new Error("Ajoutez au moins une ligne");
  const code = await nextSimpleCode("customer_order", "CM", 5);
  const order = await prisma.customerOrder.create({
    data: {
      code,
      customerId: d.customerId,
      status: "QUOTE",
      dueDate: d.dueDate ? new Date(d.dueDate) : null,
      notes: d.notes || null,
      lines: {
        create: d.lines.map((l) => ({
          productId: l.productId,
          qty: l.qty,
          unitPriceHT: l.unitPriceHT,
          vatRateId: l.vatRateId || null,
          description: l.description || null,
        })),
      },
    },
  });
  await audit({ userId: u.uid, action: "CREATE", entity: "CustomerOrder", entityId: order.id });
  revalidatePath("/orders/customer");
  return { ok: true, id: order.id };
}

export async function setCustomerOrderStatus(id: string, status: string) {
  const u = await requirePermission("sales.write");
  await prisma.customerOrder.update({ where: { id }, data: { status } });
  await audit({ userId: u.uid, action: "STATUS_CHANGE", entity: "CustomerOrder", entityId: id, diff: { status } });
  revalidatePath(`/orders/customer/${id}`);
  revalidatePath("/orders/customer");
  return { ok: true };
}

export async function confirmQuote(id: string) {
  const u = await requirePermission("sales.write");
  const order = await prisma.customerOrder.findUnique({ where: { id } });
  if (!order) throw new Error("Commande introuvable");
  if (order.status !== "QUOTE") throw new Error("Commande deja confirmee");
  await prisma.customerOrder.update({ where: { id }, data: { status: "CONFIRMED" } });
  await audit({ userId: u.uid, action: "CONFIRM", entity: "CustomerOrder", entityId: id });
  revalidatePath(`/orders/customer/${id}`);
  revalidatePath("/orders/customer");
  return { ok: true };
}

export async function cancelCustomerOrder(id: string) {
  const u = await requirePermission("sales.write");
  await prisma.customerOrder.update({ where: { id }, data: { status: "CANCELLED" } });
  await audit({ userId: u.uid, action: "CANCEL", entity: "CustomerOrder", entityId: id });
  revalidatePath(`/orders/customer/${id}`);
  return { ok: true };
}

export async function deleteCustomerOrder(id: string) {
  const u = await requirePermission("sales.write");
  const order = await prisma.customerOrder.findUnique({
    where: { id },
    include: { _count: { select: { manufacturingOrders: true, invoices: true } } },
  });
  if (!order) throw new Error("Commande introuvable");
  if (order._count.manufacturingOrders > 0 || order._count.invoices > 0) {
    throw new Error("Commande liee a des OF ou factures, suppression impossible");
  }
  await prisma.customerOrder.delete({ where: { id } });
  await audit({ userId: u.uid, action: "DELETE", entity: "CustomerOrder", entityId: id });
  revalidatePath("/orders/customer");
  return { ok: true };
}
