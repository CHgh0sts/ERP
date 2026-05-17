"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { confirmQuote, setCustomerOrderStatus, cancelCustomerOrder } from "../actions";
import { createOfFromCustomerOrder } from "@/app/(app)/manufacturing/actions";

export default function CustomerOrderDetailClient(props: {
  orderId: string;
  status: string;
  hasActiveBoms: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function run(fn: () => Promise<unknown>) {
    setErr(null);
    start(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        setErr((e as Error).message);
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      {props.status === "QUOTE" && (
        <Button size="sm" onClick={() => run(() => confirmQuote(props.orderId))} disabled={pending}>
          Confirmer (devis -&gt; commande)
        </Button>
      )}
      {props.status === "CONFIRMED" && props.hasActiveBoms && (
        <Button
          size="sm"
          onClick={() =>
            run(async () => {
              const r = await createOfFromCustomerOrder(props.orderId);
              router.push(`/manufacturing/${r.id}`);
            })
          }
          disabled={pending}
        >
          Generer les OF
        </Button>
      )}
      {props.status === "CONFIRMED" && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => run(() => setCustomerOrderStatus(props.orderId, "IN_PRODUCTION"))}
          disabled={pending}
        >
          Passer en production
        </Button>
      )}
      {(props.status === "IN_PRODUCTION" || props.status === "CONFIRMED") && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => run(() => setCustomerOrderStatus(props.orderId, "READY"))}
          disabled={pending}
        >
          Marquer prete
        </Button>
      )}
      {props.status === "READY" && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => run(() => setCustomerOrderStatus(props.orderId, "SHIPPED"))}
          disabled={pending}
        >
          Expediee
        </Button>
      )}
      {props.status !== "CANCELLED" && props.status !== "INVOICED" && (
        <Button
          size="sm"
          variant="destructive"
          onClick={() => {
            if (!confirm("Annuler cette commande ?")) return;
            run(() => cancelCustomerOrder(props.orderId));
          }}
          disabled={pending}
        >
          Annuler
        </Button>
      )}
      {err && <span className="text-sm text-destructive">{err}</span>}
    </div>
  );
}
