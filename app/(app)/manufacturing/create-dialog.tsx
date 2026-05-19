"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Plus } from "lucide-react";
import NewOfClient from "./new/client";

type Prod = {
  id: string;
  code: string;
  name: string;
  boms: { id: string; version: string; isActive: boolean }[];
};

export function CreateManufacturingOrderDialog({ products }: { products: Prod[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={products.length === 0}>
        <Plus className="h-4 w-4" /> Nouvel OF
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Nouvel ordre de fabrication"
        description="Selectionnez le produit, la BOM et la quantite a produire."
        size="lg"
      >
        {open ? <NewOfClient products={products} onCancel={() => setOpen(false)} /> : null}
      </Modal>
    </>
  );
}
