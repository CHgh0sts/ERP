"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Plus, Loader2 } from "lucide-react";
import NewInvoiceClient from "./new/client";
import { getInvoiceFormData } from "./actions";

type FormData = Awaited<ReturnType<typeof getInvoiceFormData>>;

export function CreateInvoiceDialog() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"SALE" | "PURCHASE">("SALE");
  const [data, setData] = useState<FormData | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [loading, startLoad] = useTransition();

  function close() {
    setOpen(false);
  }

  function openAs(t: "SALE" | "PURCHASE") {
    setType(t);
    setOpen(true);
    setLoadErr(null);
    if (data) return;
    startLoad(async () => {
      try {
        setData(await getInvoiceFormData());
      } catch (e) {
        setLoadErr((e as Error).message);
        setData(null);
      }
    });
  }

  return (
    <>
      <div className="flex gap-2">
        <Button type="button" onClick={() => openAs("SALE")} disabled={loading && !open}>
          {loading && !open && type === "SALE" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Facture vente
        </Button>
        <Button type="button" variant="outline" onClick={() => openAs("PURCHASE")} disabled={loading && !open}>
          {loading && !open && type === "PURCHASE" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Facture achat
        </Button>
      </div>

      {open ? (
        <Modal
          open={open}
          onClose={close}
          title={type === "SALE" ? "Nouvelle facture de vente" : "Nouvelle facture d'achat"}
          description="La facture sera creee en brouillon."
          size="xl"
        >
          {loading && !data && !loadErr ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Chargement...
            </p>
          ) : null}
          {loadErr ? <p className="text-sm text-destructive">{loadErr}</p> : null}
          {data ? (
            <NewInvoiceClient
              key={type}
              type={type}
              prefillCustomerOrderId={null}
              prefillSupplierOrderId={null}
              customers={data.customers}
              suppliers={data.suppliers}
              vatRates={data.vatRates}
              customerOrders={data.customerOrders}
              supplierOrders={data.supplierOrders}
              onCancel={close}
              onSuccess={close}
            />
          ) : null}
        </Modal>
      ) : null}
    </>
  );
}
