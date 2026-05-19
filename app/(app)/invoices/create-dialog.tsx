"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Plus } from "lucide-react";
import NewInvoiceClient from "./new/client";

type Party = { id: string; name: string };
type VatRate = { id: string; code: string; rate: number; isDefault: boolean };
type CustomerOrderSrc = {
  id: string;
  code: string;
  customerId: string;
  customerName: string;
  lines: { description: string; qty: number; unitPriceHT: number; vatRateId: string | null }[];
};
type SupplierOrderSrc = {
  id: string;
  code: string;
  supplierId: string;
  supplierName: string;
  lines: { description: string; qty: number; unitPriceHT: number; vatRateCode: string }[];
};

export function CreateInvoiceDialog(props: {
  customers: Party[];
  suppliers: Party[];
  vatRates: VatRate[];
  customerOrders: CustomerOrderSrc[];
  supplierOrders: SupplierOrderSrc[];
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"SALE" | "PURCHASE">("SALE");

  function openAs(t: "SALE" | "PURCHASE") {
    setType(t);
    setOpen(true);
  }

  return (
    <>
      <div className="flex gap-2">
        <Button onClick={() => openAs("SALE")} disabled={props.customers.length === 0}>
          <Plus className="h-4 w-4" /> Facture vente
        </Button>
        <Button variant="outline" onClick={() => openAs("PURCHASE")} disabled={props.suppliers.length === 0}>
          <Plus className="h-4 w-4" /> Facture achat
        </Button>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={type === "SALE" ? "Nouvelle facture de vente" : "Nouvelle facture d'achat"}
        description="La facture sera creee en brouillon."
        size="xl"
      >
        {open ? (
          <NewInvoiceClient
            key={type}
            type={type}
            prefillCustomerOrderId={null}
            prefillSupplierOrderId={null}
            customers={props.customers}
            suppliers={props.suppliers}
            vatRates={props.vatRates}
            customerOrders={props.customerOrders}
            supplierOrders={props.supplierOrders}
            onCancel={() => setOpen(false)}
          />
        ) : null}
      </Modal>
    </>
  );
}
