"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Plus } from "lucide-react";
import NewOrderClient from "./new/client";

type SupArticle = { id: string; priceHT: number; moq: number; codeArticle: string; description: string };
type Sup = { id: string; name: string; articles: SupArticle[] };

export function CreateSupplierOrderDialog({ suppliers }: { suppliers: Sup[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={suppliers.length === 0}>
        <Plus className="h-4 w-4" /> Nouvelle commande
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Nouvelle commande fournisseur"
        description="Saisissez l'entete et les lignes de la commande."
        size="xl"
      >
        {open ? <NewOrderClient suppliers={suppliers} onCancel={() => setOpen(false)} /> : null}
      </Modal>
    </>
  );
}
