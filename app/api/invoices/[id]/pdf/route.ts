import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatEUR, formatDate } from "@/lib/utils";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!hasPermission(user, "invoices.read")) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: { customer: true, supplier: true, lines: { include: { vatRate: true } }, payments: true },
  });
  if (!inv) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const company = await prisma.company.findFirst();
  const paid = inv.payments.reduce((s, p) => s + p.amount, 0);

  const party = inv.customer ?? inv.supplier;
  const typeLabel = inv.type === "SALE" ? "FACTURE" : "FACTURE D'ACHAT";

  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${typeLabel} ${inv.code}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; margin: 40px; color: #111; }
  h1 { margin: 0; }
  .row { display: flex; justify-content: space-between; margin: 20px 0; }
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
<h1>${typeLabel}</h1>
<h2 style="margin:4px 0;font-size:18px;">N ${inv.code}</h2>
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
    <b>${party?.name ?? ""}</b><br>
    ${party?.address ?? ""}<br>
    ${party?.postalCode ?? ""} ${party?.city ?? ""}<br>
    ${party?.country ?? ""}<br>
    TVA : ${party?.vatNumber ?? "-"}
  </div>
</div>
<div>
  Date : ${formatDate(inv.issueDate)}<br>
  ${inv.dueDate ? "Echeance : " + formatDate(inv.dueDate) : ""}
</div>
<table>
  <thead><tr><th>Description</th><th>Qte</th><th>Prix HT</th><th>TVA</th><th>Total HT</th></tr></thead>
  <tbody>
    ${inv.lines
      .map(
        (l) => `<tr>
      <td>${escapeHtml(l.description)}</td>
      <td>${l.qty}</td>
      <td>${formatEUR(l.unitPriceHT)}</td>
      <td>${l.vatRate?.code ?? "-"}</td>
      <td>${formatEUR(l.qty * l.unitPriceHT)}</td>
    </tr>`,
      )
      .join("")}
  </tbody>
</table>
<div class="totals">
  <div>Total HT : ${formatEUR(inv.totalHT)}</div>
  <div>TVA : ${formatEUR(inv.totalVat)}</div>
  <div class="big">Total TTC : ${formatEUR(inv.totalTTC)}</div>
  <div>Deja paye : ${formatEUR(paid)}</div>
  <div><b>Reste : ${formatEUR(inv.totalTTC - paid)}</b></div>
</div>
${inv.notes ? `<p><b>Notes :</b> ${escapeHtml(inv.notes)}</p>` : ""}
</body></html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
