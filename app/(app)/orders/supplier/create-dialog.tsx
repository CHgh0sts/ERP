"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Plus, Loader2 } from "lucide-react";
import NewOrderClient from "./new/client";
import { getSupplierOrderFormData } from "./actions";

type SupArticle = { id: string; priceHT: number; moq: number; codeArticle: string; description: string };
type Sup = { id: string; name: string; articles: SupArticle[] };

export function CreateSupplierOrderDialog() {
  const [open, setOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<Sup[] | null>(null);
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
        const data = await getSupplierOrderFormData();
        setSuppliers(data);
      } catch (e) {
        setLoadErr((e as Error).message);
        setSuppliers(null);
      }
    });
  }

  return (
    <>
      <Button type="button" onClick={handleOpen} disabled={loading && !open}>
        {loading && !open ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Nouvelle commande
      </Button>

      {open ? (
        <Modal
          open={open}
          onClose={close}
          title="Nouvelle commande fournisseur"
          description="Saisissez l'entete et les lignes de la commande."
          size="xl"
        >
          {loading && !suppliers && !loadErr ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Chargement...
            </p>
          ) : null}
          {loadErr ? <p className="text-sm text-destructive">{loadErr}</p> : null}
          {suppliers && suppliers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun fournisseur disponible.</p>
          ) : null}
          {suppliers && suppliers.length > 0 ? (
            <NewOrderClient suppliers={suppliers} onCancel={close} onSuccess={close} />
          ) : null}
        </Modal>
      ) : null}
    </>
  );
}
