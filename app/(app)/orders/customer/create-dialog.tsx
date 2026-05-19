"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Plus } from "lucide-react";
import NewCustomerOrderClient from "./new/client";

type Customer = { id: string; name: string };
type Product = { id: string; code: string; name: string; salePriceHT: number };
type VatRate = { id: string; code: string; rate: number; isDefault: boolean };

export function CreateCustomerOrderDialog({
  customers,
  products,
  vatRates,
}: {
  customers: Customer[];
  products: Product[];
  vatRates: VatRate[];
}) {
  const [open, setOpen] = useState(false);
  const canCreate = customers.length > 0 && products.length > 0;

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={!canCreate}>
        <Plus className="h-4 w-4" /> Nouveau devis
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Nouveau devis / commande client"
        description="Creez un devis avec une ou plusieurs lignes produit."
        size="xl"
      >
        {open ? (
          <NewCustomerOrderClient
            customers={customers}
            products={products}
            vatRates={vatRates}
            onCancel={() => setOpen(false)}
          />
        ) : null}
      </Modal>
    </>
  );
}
