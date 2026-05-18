"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/alert";
import { CrudModalFooter } from "@/components/ui/crud-modal-footer";
import { Package } from "lucide-react";
import { setOrderStatus, receiveOrder } from "../actions";

type LineLite = {
  id: string;
  codeArticle: string;
  description: string;
  qtyOrdered: number;
  qtyReceived: number;
  unitPriceHT: number;
};

type Props = {
  order: { id: string; code: string; status: string };
  lines: LineLite[];
  locations: Array<{ id: string; code: string; name: string }>;
};

export default function OrderClient({ order, lines, locations }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const [recv, setRecv] = useState(() =>
    lines.map((l) => ({
      supplierOrderLineId: l.id,
      qty: Math.max(0, l.qtyOrdered - l.qtyReceived),
      locationId: locations[0]?.id ?? "",
      lotNumber: "",
      packagingState: "UNITAIRE",
    })),
  );

  async function changeStatus(s: string) {
    start(async () => {
      await setOrderStatus(order.id, s);
      router.refresh();
    });
  }

  async function submitRecv() {
    setErr(null);
    start(async () => {
      try {
        await receiveOrder({
          supplierOrderId: order.id,
          lines: recv.map((r) => ({
            supplierOrderLineId: r.supplierOrderLineId,
            qty: r.qty,
            locationId: r.locationId || null,
            lotNumber: r.lotNumber || null,
            packagingState: r.packagingState,
          })),
        });
        setOpen(false);
        router.refresh();
      } catch (e) {
        setErr((e as Error).message);
      }
    });
  }

  return (
    <>
      <div className="flex gap-2">
        {order.status === "DRAFT" && (
          <Button size="sm" variant="outline" onClick={() => changeStatus("SENT")} disabled={pending}>
            Marquer envoyee
          </Button>
        )}
        {order.status !== "CANCELLED" && order.status !== "RECEIVED" && (
          <Button size="sm" onClick={() => setOpen(true)} disabled={pending}>
            <Package className="h-4 w-4" /> Reception
          </Button>
        )}
        {order.status !== "RECEIVED" && order.status !== "CANCELLED" && (
          <Button size="sm" variant="destructive" onClick={() => changeStatus("CANCELLED")} disabled={pending}>
            Annuler
          </Button>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => !pending && setOpen(false)}
        title={`Reception commande ${order.code}`}
        size="xl"
        footer={
          <CrudModalFooter
            pending={pending}
            onClose={() => setOpen(false)}
            onSubmit={submitRecv}
            submitLabel="Valider la reception"
          />
        }
      >
        <div className="space-y-4">
          {err && (
            <Alert variant="destructive" title="Erreur">
              {err}
            </Alert>
          )}
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-1">Article</th>
                <th>Restant</th>
                <th>A recevoir</th>
                <th>Emplacement</th>
                <th>Lot</th>
                <th>Cond.</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={l.id} className="border-b">
                  <td className="py-1">
                    <span className="font-mono text-xs">{l.codeArticle}</span>
                    <br />
                    {l.description}
                  </td>
                  <td>{l.qtyOrdered - l.qtyReceived}</td>
                  <td>
                    <Input
                      type="number"
                      step="0.001"
                      min={0}
                      max={l.qtyOrdered - l.qtyReceived}
                      value={recv[i].qty}
                      onChange={(e) =>
                        setRecv((prev) => prev.map((r, idx) => (idx === i ? { ...r, qty: Number(e.target.value) || 0 } : r)))
                      }
                    />
                  </td>
                  <td>
                    <Select
                      value={recv[i].locationId}
                      onChange={(e) =>
                        setRecv((prev) => prev.map((r, idx) => (idx === i ? { ...r, locationId: e.target.value } : r)))
                      }
                    >
                      <option value="">(aucun)</option>
                      {locations.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.code} - {x.name}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td>
                    <Input
                      value={recv[i].lotNumber}
                      onChange={(e) =>
                        setRecv((prev) => prev.map((r, idx) => (idx === i ? { ...r, lotNumber: e.target.value } : r)))
                      }
                    />
                  </td>
                  <td>
                    <Select
                      value={recv[i].packagingState}
                      onChange={(e) =>
                        setRecv((prev) =>
                          prev.map((r, idx) => (idx === i ? { ...r, packagingState: e.target.value } : r)),
                        )
                      }
                    >
                      <option value="UNITAIRE">Unitaire</option>
                      <option value="REEL">Reel</option>
                      <option value="BOBINE">Bobine</option>
                      <option value="BANDE">Bande</option>
                      <option value="RESTE">Reste</option>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground">
            La reception creera les unites de stock (codes uniques), les mouvements d&apos;entree, et
            l&apos;ecriture comptable correspondante sur le journal AC (607 / 44566 / 401).
          </p>
        </div>
      </Modal>
    </>
  );
}
