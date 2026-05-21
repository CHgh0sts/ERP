"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { reserveOf, triggerPurchaseForShortages, startOf, consumeAndFinish, cancelOf } from "../actions";

type Reservation = {
  id: string;
  articleId: string;
  codeArticle: string;
  description: string;
  reference: string | null;
  qtyNeeded: number;
  qtyReserved: number;
  qtyConsumed: number;
};
type Unit = {
  id: string;
  articleId: string;
  codeUnique: string;
  articleCode: string;
  qtyOnHand: number;
  qtyReserved: number;
  lotNumber: string | null;
  location: string | null;
};

export default function OfClient(props: {
  ofId: string;
  status: string;
  reservations: Reservation[];
  stockUnits: Unit[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [shortages, setShortages] = useState<{ codeArticle: string; description: string; missing: number }[]>([]);
  const [consumptions, setConsumptions] = useState<Record<string, number>>({});

  const unitsByArticle = useMemo(() => {
    const map = new Map<string, Unit[]>();
    for (const u of props.stockUnits) {
      if (!map.has(u.articleId)) map.set(u.articleId, []);
      map.get(u.articleId)!.push(u);
    }
    return map;
  }, [props.stockUnits]);

  function run(fn: () => Promise<unknown>) {
    setErr(null);
    setMsg(null);
    start(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        setErr((e as Error).message);
      }
    });
  }

  async function doReserve() {
    setErr(null);
    setMsg(null);
    start(async () => {
      try {
        const r = await reserveOf(props.ofId);
        setShortages(r.shortages);
        if (r.shortages.length === 0) {
          setMsg("Toutes les reservations effectuees.");
        } else {
          setMsg(`Reservation partielle - ${r.shortages.length} ruptures`);
        }
        router.refresh();
      } catch (e) {
        setErr((e as Error).message);
      }
    });
  }

  async function doAutoPurchase() {
    setErr(null);
    setMsg(null);
    start(async () => {
      try {
        const r = await triggerPurchaseForShortages(props.ofId);
        if (r.orders.length === 0) setMsg("Aucun fournisseur trouve pour les manques.");
        else setMsg(`${r.orders.length} commande(s) fournisseur generee(s) : ${r.orders.map((o) => o.code).join(", ")}`);
        router.refresh();
      } catch (e) {
        setErr((e as Error).message);
      }
    });
  }

  async function doConsume() {
    const items = Object.entries(consumptions)
      .filter(([, q]) => q > 0)
      .map(([stockUnitId, qty]) => ({ stockUnitId, qty }));
    if (items.length === 0) {
      setErr("Aucune consommation saisie");
      return;
    }
    run(() => consumeAndFinish({ ofId: props.ofId, consumptions: items }));
  }

  const canReserve = ["DRAFT", "PLANNED", "RESERVED"].includes(props.status);
  const canStart = props.status === "RESERVED";
  const canConsume = ["IN_PROGRESS", "RESERVED"].includes(props.status);
  const canCancel = !["DONE", "CANCELLED"].includes(props.status);

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {canReserve && (
          <Button size="sm" onClick={doReserve} disabled={pending}>
            Reserver composants
          </Button>
        )}
        {shortages.length > 0 && (
          <Button size="sm" variant="outline" onClick={doAutoPurchase} disabled={pending}>
            Generer commandes fournisseur pour manques
          </Button>
        )}
        {canStart && (
          <Button size="sm" onClick={() => run(() => startOf(props.ofId))} disabled={pending}>
            Demarrer production
          </Button>
        )}
        {canCancel && (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              if (!confirm("Annuler cet OF et liberer les reservations ?")) return;
              run(() => cancelOf(props.ofId));
            }}
            disabled={pending}
          >
            Annuler OF
          </Button>
        )}
      </div>

      {err && <p className="text-sm text-destructive">{err}</p>}
      {msg && <p className="text-sm text-emerald-600">{msg}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Besoins en composants</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-1">Ref</th>
                <th>Article</th>
                <th>Description</th>
                <th>Besoin</th>
                <th>Reserve</th>
                <th>Consomme</th>
                <th>Manquant</th>
                <th>Etat</th>
              </tr>
            </thead>
            <tbody>
              {props.reservations.map((r) => {
                const missing = Math.max(0, r.qtyNeeded - r.qtyReserved - r.qtyConsumed);
                const ok = missing === 0;
                return (
                  <tr key={r.id} className="border-t">
                    <td className="py-1 font-mono text-xs">{r.reference || "—"}</td>
                    <td className="py-1 font-mono text-xs">{r.codeArticle}</td>
                    <td>{r.description}</td>
                    <td>{r.qtyNeeded}</td>
                    <td>{r.qtyReserved}</td>
                    <td>{r.qtyConsumed}</td>
                    <td>{missing}</td>
                    <td>{ok ? <Badge>OK</Badge> : <Badge variant="destructive">Manque</Badge>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {canConsume && (
        <Card>
          <CardHeader>
            <CardTitle>Consommer le stock</CardTitle>
          </CardHeader>
          <CardContent>
            {props.reservations.map((r) => {
              const units = unitsByArticle.get(r.articleId) ?? [];
              const groupKey = r.id;
              if (units.length === 0)
                return (
                  <div key={groupKey} className="mb-3">
                    <div className="font-medium text-sm">
                      {r.codeArticle} - {r.description}
                    </div>
                    <p className="text-xs text-muted-foreground">Aucune unite disponible en stock</p>
                  </div>
                );
              return (
                <div key={groupKey} className="mb-3">
                  <div className="font-medium text-sm mb-1">
                    {r.codeArticle} - {r.description} (besoin restant : {r.qtyNeeded - r.qtyConsumed})
                  </div>
                  <table className="w-full text-xs">
                    <thead className="text-left text-[10px] uppercase text-muted-foreground">
                      <tr>
                        <th className="py-1">Code unique</th>
                        <th>Lot</th>
                        <th>Emplacement</th>
                        <th>Dispo</th>
                        <th>Reserve</th>
                        <th>Qte a consommer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {units.map((u) => (
                        <tr key={u.id} className="border-t">
                          <td className="py-1 font-mono">{u.codeUnique}</td>
                          <td>{u.lotNumber ?? "-"}</td>
                          <td>{u.location ?? "-"}</td>
                          <td>{u.qtyOnHand}</td>
                          <td>{u.qtyReserved}</td>
                          <td>
                            <Input
                              type="number"
                              step="0.001"
                              min={0}
                              max={u.qtyOnHand}
                              value={consumptions[u.id] ?? 0}
                              onChange={(e) =>
                                setConsumptions({ ...consumptions, [u.id]: Number(e.target.value) || 0 })
                              }
                              className="h-7"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
            <div className="flex justify-end">
              <Button size="sm" onClick={doConsume} disabled={pending}>
                Consommer & terminer OF
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
