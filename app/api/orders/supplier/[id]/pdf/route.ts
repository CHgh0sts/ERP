import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatEUR, formatDate } from "@/lib/utils";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!hasPermission(user, "purchase.read")) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const order = await prisma.supplierOrder.findUnique({
    where: { id },
    include: {
      supplier: true,
      lines: { include: { articleSupplier: { include: { article: true } } } },
    },
  });
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const company = await prisma.company.findFirst();

  const totalHT = order.lines.reduce((s, l) => s + l.qtyOrdered * l.unitPriceHT, 0);
  const vatMap = new Map<string, number>();
  for (const l of order.lines) {
    const rate = { TVA20: 20, TVA10: 10, TVA55: 5.5, TVA21: 2.1, TVA0: 0 }[l.vatRateCode] || 0;
    vatMap.set(l.vatRateCode, (vatMap.get(l.vatRateCode) || 0) + l.qtyOrdered * l.unitPriceHT * (rate / 100));
  }
  const totalVat = Array.from(vatMap.values()).reduce((a, b) => a + b, 0);
  const totalTTC = totalHT + totalVat;

  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Bon de commande ${order.code}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; margin: 40px; color: #111; }
  h1 { margin: 0 0 8px 0; }
  .row { display: flex; justify-content: space-between; margin-bottom: 20px; }
  .box { border: 1px solid #ccc; padding: 10px; width: 45%; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; }
  th, td { padding: 6px; border-bottom: 1px solid #ddd; text-align: left; }
  th { background: #f5f5f5; }
  .totals { text-align: right; margin-top: 20px; }
  .totals div { margin: 3px 0; }
  .totals .big { font-size: 16px; font-weight: bold; }
  @media print { body { margin: 10mm; } button { display: none; } }
</style>
</head>
<body>
<button onclick="window.print()">Imprimer / Enregistrer en PDF</button>
<h1>Bon de commande fournisseur</h1>
<div class="row">
  <div class="box">
    <b>${company?.name ?? "Societe"}</b><br>
    ${company?.address ?? ""}<br>
    ${company?.postalCode ?? ""} ${company?.city ?? ""}<br>
    ${company?.country ?? ""}<br>
    SIRET : ${company?.siret ?? "-"}<br>
    TVA : ${company?.vatNumber ?? "-"}
  </div>
  <div class="box">
    <b>Fournisseur</b><br>
    ${order.supplier.name}<br>
    ${order.supplier.address ?? ""}<br>
    ${order.supplier.postalCode ?? ""} ${order.supplier.city ?? ""}<br>
    ${order.supplier.country}<br>
    TVA : ${order.supplier.vatNumber ?? "-"}
  </div>
</div>
<div>
  <b>N° commande : ${order.code}</b><br>
  Date : ${formatDate(order.orderDate)}<br>
  ${order.expectedAt ? "Livraison prevue : " + formatDate(order.expectedAt) : ""}
</div>
<table>
  <thead><tr><th>Reference</th><th>Designation</th><th>Qte</th><th>Prix HT</th><th>TVA</th><th>Total HT</th></tr></thead>
  <tbody>
    ${order.lines
      .map(
        (l) => `<tr>
      <td>${l.articleSupplier.article.codeArticle}${l.articleSupplier.supplierRef ? " / " + l.articleSupplier.supplierRef : ""}</td>
      <td>${l.articleSupplier.article.description}</td>
      <td>${l.qtyOrdered}</td>
      <td>${formatEUR(l.unitPriceHT)}</td>
      <td>${l.vatRateCode}</td>
      <td>${formatEUR(l.qtyOrdered * l.unitPriceHT)}</td>
    </tr>`,
      )
      .join("")}
  </tbody>
</table>
<div class="totals">
  <div>Total HT : ${formatEUR(totalHT)}</div>
  <div>TVA : ${formatEUR(totalVat)}</div>
  <div class="big">Total TTC : ${formatEUR(totalTTC)}</div>
</div>
${order.notes ? `<p><b>Notes :</b> ${order.notes}</p>` : ""}
</body></html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
