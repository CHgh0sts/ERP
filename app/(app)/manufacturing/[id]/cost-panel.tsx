import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatEUR, formatNumber } from "@/lib/utils";
import { computeOfCostSummary, COST_SOURCE_LABELS } from "@/lib/manufacturing/cost";

export default async function OfCostPanel({ ofId }: { ofId: string }) {
  const cost = await computeOfCostSummary(ofId);
  if (!cost) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cout de production</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {cost.hasUnknownPrices && (
          <p className="text-sm text-amber-600">
            Certains composants n&apos;ont pas de prix d&apos;achat connu : l&apos;estimation peut etre incomplete.
          </p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="rounded-md border border-border p-3">
            <div className="text-xs text-muted-foreground">Cout estime (total)</div>
            <div className="text-lg font-semibold">{formatEUR(cost.estimatedTotalHT)}</div>
            <div className="text-xs text-muted-foreground">{formatEUR(cost.estimatedUnitHT)} / unite</div>
          </div>
          <div className="rounded-md border border-border p-3">
            <div className="text-xs text-muted-foreground">Cout reel (total)</div>
            <div className="text-lg font-semibold">
              {cost.actualTotalHT != null ? formatEUR(cost.actualTotalHT) : "—"}
            </div>
            <div className="text-xs text-muted-foreground">
              {cost.actualUnitHT != null ? `${formatEUR(cost.actualUnitHT)} / unite` : "Apres consommation"}
            </div>
          </div>
          {cost.productSalePriceHT != null && (
            <>
              <div className="rounded-md border border-border p-3">
                <div className="text-xs text-muted-foreground">Marge estimee</div>
                <div className="text-lg font-semibold">
                  {cost.estimatedMarginHT != null ? formatEUR(cost.estimatedMarginHT) : "—"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {cost.estimatedMarginPct != null ? `${formatNumber(cost.estimatedMarginPct, 1)} %` : "—"}
                </div>
              </div>
              <div className="rounded-md border border-border p-3">
                <div className="text-xs text-muted-foreground">Marge reelle</div>
                <div className="text-lg font-semibold">
                  {cost.actualMarginHT != null ? formatEUR(cost.actualMarginHT) : "—"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {cost.actualMarginPct != null ? `${formatNumber(cost.actualMarginPct, 1)} %` : "—"}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground border-t border-border pt-3">
          <div>Composants estimes : {formatEUR(cost.estimatedComponentsHT)}</div>
          <div>Main d&apos;oeuvre : {formatEUR(cost.laborCostHT)}</div>
          <div>Frais generaux : {formatEUR(cost.overheadCostHT)}</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-1">Ref</th>
                <th>Composant</th>
                <th>Qte</th>
                <th>Prix unit.</th>
                <th>Source prix</th>
                <th>Cout estime</th>
                <th>Cout reel</th>
              </tr>
            </thead>
            <tbody>
              {cost.lines.map((l) => (
                <tr key={l.reservationId} className="border-t">
                  <td className="py-1 font-mono text-xs">{l.reference || "—"}</td>
                  <td>
                    <div className="font-mono text-xs">{l.codeArticle}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[220px]">{l.description}</div>
                  </td>
                  <td>{formatNumber(l.qtyNeeded, 4)}</td>
                  <td>{formatEUR(l.unitCostHT)}</td>
                  <td>
                    <Badge variant="secondary" className="text-[10px]">
                      {COST_SOURCE_LABELS[l.source]}
                    </Badge>
                  </td>
                  <td>{formatEUR(l.estimatedLineHT)}</td>
                  <td>{l.actualLineHT != null ? formatEUR(l.actualLineHT) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
