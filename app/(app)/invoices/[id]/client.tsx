"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/alert";
import { CrudModalFooter } from "@/components/ui/crud-modal-footer";
import { Plus } from "lucide-react";
import { issueInvoice, addPayment, cancelInvoice } from "../actions";

export default function InvoiceClient(props: {
  invoiceId: string;
  status: string;
  totalTTC: number;
  paid: number;
  remaining: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [amount, setAmount] = useState(Math.max(0, props.remaining));
  const [method, setMethod] = useState("TRANSFER");
  const [at, setAt] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");

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

  async function submitPayment() {
    setErr(null);
    start(async () => {
      try {
        await addPayment({
          invoiceId: props.invoiceId,
          amount,
          method,
          at,
          reference: reference || null,
        });
        setPaymentOpen(false);
        router.refresh();
      } catch (e) {
        setErr((e as Error).message);
      }
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {props.status === "DRAFT" && (
          <Button size="sm" onClick={() => run(() => issueInvoice(props.invoiceId))} disabled={pending}>
            Emettre (generer ecriture)
          </Button>
        )}
        {(props.status === "ISSUED" || props.status === "PARTIAL") && (
          <Button size="sm" onClick={() => setPaymentOpen(true)} disabled={pending}>
            <Plus className="h-4 w-4" /> Paiement
          </Button>
        )}
        {props.status !== "CANCELLED" && props.status !== "PAID" && (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              if (!confirm("Annuler cette facture ?")) return;
              run(() => cancelInvoice(props.invoiceId));
            }}
            disabled={pending}
          >
            Annuler
          </Button>
        )}
        {err && !paymentOpen && (
          <Alert variant="destructive" title="Erreur" className="py-1 px-2 text-sm">
            {err}
          </Alert>
        )}
      </div>

      <Modal
        open={paymentOpen}
        onClose={() => !pending && setPaymentOpen(false)}
        title="Nouveau paiement"
        size="md"
        footer={
          <CrudModalFooter
            pending={pending}
            onClose={() => setPaymentOpen(false)}
            onSubmit={submitPayment}
            submitLabel="Enregistrer"
          />
        }
      >
        <div className="space-y-4">
          {err && (
            <Alert variant="destructive" title="Erreur">
              {err}
            </Alert>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Montant</Label>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label>Methode</Label>
              <Select value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="TRANSFER">Virement</option>
                <option value="CARD">Carte</option>
                <option value="CASH">Especes</option>
                <option value="CHECK">Cheque</option>
              </Select>
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={at} onChange={(e) => setAt(e.target.value)} />
            </div>
            <div>
              <Label>Reference</Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
