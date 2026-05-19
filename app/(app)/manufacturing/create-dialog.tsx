"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Plus, Loader2 } from "lucide-react";
import NewOfClient from "./new/client";
import { getManufacturingOrderFormData } from "./actions";

type Prod = {
  id: string;
  code: string;
  name: string;
  boms: { id: string; version: string; isActive: boolean }[];
};

export function CreateManufacturingOrderDialog() {
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<Prod[] | null>(null);
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
        setProducts(await getManufacturingOrderFormData());
      } catch (e) {
        setLoadErr((e as Error).message);
        setProducts(null);
      }
    });
  }

  return (
    <>
      <Button type="button" onClick={handleOpen} disabled={loading && !open}>
        {loading && !open ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Nouvel OF
      </Button>

      {open ? (
        <Modal
          open={open}
          onClose={close}
          title="Nouvel ordre de fabrication"
          description="Selectionnez le produit, la BOM et la quantite a produire."
          size="lg"
        >
          {loading && !products && !loadErr ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Chargement...
            </p>
          ) : null}
          {loadErr ? <p className="text-sm text-destructive">{loadErr}</p> : null}
          {products && products.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun produit avec BOM. Creez d&apos;abord une nomenclature depuis Produits.
            </p>
          ) : null}
          {products && products.length > 0 ? (
            <NewOfClient products={products} onCancel={close} onSuccess={close} />
          ) : null}
        </Modal>
      ) : null}
    </>
  );
}
