"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { searchTraceability, type TimelineEvent } from "./actions";

type Result = Awaited<ReturnType<typeof searchTraceability>>;

export default function TraceabilityClient() {
  const [term, setTerm] = useState("");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  function submit() {
    setErr(null);
    start(async () => {
      try {
        const r = await searchTraceability(term);
        setResult(r);
      } catch (e) {
        setErr((e as Error).message);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Code unique stock, commande client, OF ou code article..."
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <Button onClick={submit} disabled={pending}>
          {pending ? "..." : "Rechercher"}
        </Button>
      </div>
      {err && <p className="text-sm text-destructive">{err}</p>}

      {result?.type === "empty" && <p className="text-sm text-muted-foreground">Saisissez un terme</p>}
      {result?.type === "not_found" && <p className="text-sm text-muted-foreground">Aucun resultat</p>}

      {result?.type === "stockUnit" && (
        <div className="space-y-3">
          <div className="border rounded p-3 bg-muted/30">
            <div className="font-mono text-lg">{result.data.header.codeUnique}</div>
            <div className="text-sm">{result.data.header.article}</div>
            <div className="text-xs text-muted-foreground">
              Stock on-hand {result.data.header.qtyOnHand} / reserve {result.data.header.qtyReserved} - Emplacement{" "}
              {result.data.header.location ?? "-"}
              {result.data.header.lotNumber && " - Lot " + result.data.header.lotNumber}
            </div>
          </div>
          <Timeline events={result.data.events} />
        </div>
      )}

      {result?.type === "customerOrder" && (
        <div className="space-y-3">
          <div className="border rounded p-3 bg-muted/30">
            <div className="font-mono text-lg">{result.data.header.code}</div>
            <div className="text-sm">Client : {result.data.header.customer}</div>
            <div className="text-xs"><Badge variant="secondary">{result.data.header.status}</Badge></div>
            <ul className="text-xs mt-2 space-y-0.5">
              {result.data.header.lines.map((l, i) => (
                <li key={i}>
                  {l.qty} x {l.product}
                </li>
              ))}
            </ul>
          </div>
          <Timeline events={result.data.events} />
        </div>
      )}

      {result?.type === "manufacturingOrder" && (
        <div className="space-y-3">
          <div className="border rounded p-3 bg-muted/30">
            <div className="font-mono text-lg">{result.data.header.code}</div>
            <div className="text-sm">
              {result.data.header.product} (BOM v{result.data.header.bomVersion}) - qte {result.data.header.qty}
            </div>
            <div className="text-xs">
              <Badge variant="secondary">{result.data.header.status}</Badge>
              {result.data.header.customerOrder && (
                <span className="ml-2">Commande {result.data.header.customerOrder}</span>
              )}
            </div>
          </div>
          <Timeline events={result.data.events} />
        </div>
      )}

      {result?.type === "article" && (
        <div className="space-y-2">
          <div className="border rounded p-3 bg-muted/30">
            <div className="font-mono text-lg">{result.data.codeArticle}</div>
            <div className="text-sm">{result.data.description}</div>
          </div>
          <div className="text-sm">Dernieres unites en stock :</div>
          <ul className="text-xs space-y-1">
            {result.data.stockUnits.map((u) => (
              <li key={u.id} className="border rounded px-2 py-1">
                <Link href={`/traceability?q=${u.codeUnique}`} className="font-mono hover:underline">
                  {u.codeUnique}
                </Link>{" "}
                - qte {u.qtyOnHand} - {u.location?.name ?? "-"}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Timeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) return <p className="text-sm text-muted-foreground">Aucun evenement</p>;
  return (
    <ol className="relative border-l pl-4 space-y-3">
      {events.map((e, i) => (
        <li key={i} className="relative">
          <span className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-primary" />
          <div className="text-xs text-muted-foreground">{formatDateTime(new Date(e.at))}</div>
          <div className="text-sm font-medium">
            <Badge variant="outline" className="mr-2">
              {e.type}
            </Badge>
            {e.label}
          </div>
          {e.detail && <div className="text-xs text-muted-foreground">{e.detail}</div>}
          {e.ref && (
            <Link href={refHref(e.ref)} className="text-xs underline">
              Ouvrir
            </Link>
          )}
        </li>
      ))}
    </ol>
  );
}

function refHref(ref: NonNullable<TimelineEvent["ref"]>): string {
  switch (ref.kind) {
    case "stock":
      return `/stock`;
    case "of":
      return `/manufacturing/${ref.id}`;
    case "customerOrder":
      return `/orders/customer/${ref.id}`;
    case "supplierOrder":
      return `/orders/supplier/${ref.id}`;
    case "article":
      return `/components/${ref.id}`;
  }
}
