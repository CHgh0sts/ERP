"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Copy } from "lucide-react";
import { copyManufacturingOrder } from "../actions";

export default function CopyOfButton(props: { ofId: string; ofCode: string; qty: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [qty, setQty] = useState(String(props.qty));
  const [notes, setNotes] = useState("");

  function submit() {
    setErr(null);
    start(async () => {
      try {
        const r = await copyManufacturingOrder(props.ofId, {
          qty: Number(qty) || props.qty,
          notes: notes || null,
        });
        setOpen(false);
        router.push(`/manufacturing/${r.id}`);
        router.refresh();
      } catch (e) {
        setErr((e as Error).message);
      }
    });
  }

  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Copy className="h-4 w-4" /> Copier cet OF
      </Button>

      {open ? (
        <Modal
          open={open}
          onClose={() => !pending && setOpen(false)}
          title="Copier l'ordre de fabrication"
          description={`Cree un nouvel OF a partir de ${props.ofCode}. Les composants sont recopies et restent modifiables.`}
          size="md"
          footer={
            <>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                Annuler
              </Button>
              <Button type="button" onClick={submit} disabled={pending}>
                {pending ? "Copie..." : "Creer la copie"}
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <div>
              <Label>Quantite a produire</Label>
              <Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
            <div>
              <Label>Notes supplementaires (optionnel)</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            {err && <p className="text-sm text-destructive">{err}</p>}
          </div>
        </Modal>
      ) : null}
    </>
  );
}
