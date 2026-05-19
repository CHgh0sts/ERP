"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Plus, Loader2 } from "lucide-react";
import NewCustomerOrderClient from "./new/client";
import { getCustomerOrderFormData } from "./actions";

type FormData = Awaited<ReturnType<typeof getCustomerOrderFormData>>;

export function CreateCustomerOrderDialog() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<FormData | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [loading, startLoad] = useTransition();

  function close() {
    setOpen(false);
  }

  function handleOpen() {
    setOpen(true);
    setLoadErr(null);
    startLoad(async () => {
      try {
        setData(await getCustomerOrderFormData());
      } catch (e) {
        setLoadErr((e as Error).message);
        setData(null);
      }
    });
  }

  const canCreate = data && data.customers.length > 0 && data.products.length > 0;

  return (
    <>
      <Button type="button" onClick={handleOpen} disabled={loading && !open}>
        {loading && !open ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Nouveau devis
      </Button>

      {open ? (
        <Modal
          open={open}
          onClose={close}
          title="Nouveau devis / commande client"
          description="Creez un devis avec une ou plusieurs lignes produit."
          size="xl"
        >
          {loading && !data && !loadErr ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Chargement...
            </p>
          ) : null}
          {loadErr ? <p className="text-sm text-destructive">{loadErr}</p> : null}
          {data && !canCreate ? (
            <p className="text-sm text-muted-foreground">
              Ajoutez au moins un client et un produit avant de creer un devis.
            </p>
          ) : null}
          {canCreate ? (
            <NewCustomerOrderClient
              customers={data.customers}
              products={data.products}
              vatRates={data.vatRates}
              onCancel={close}
              onSuccess={close}
            />
          ) : null}
        </Modal>
      ) : null}
    </>
  );
}
