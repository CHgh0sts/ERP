"use client";

import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

type Props = {
  pending?: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onDelete?: () => void;
  submitLabel?: string;
  pendingLabel?: string;
};

export function CrudModalFooter({
  pending,
  onClose,
  onSubmit,
  onDelete,
  submitLabel = "Enregistrer",
  pendingLabel = "Enregistrement...",
}: Props) {
  return (
    <div className="flex items-center justify-between w-full">
      <div>
        {onDelete ? (
          <Button variant="destructive" size="sm" onClick={onDelete} disabled={pending}>
            <Trash2 className="h-3.5 w-3.5" /> Supprimer
          </Button>
        ) : null}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onClose} disabled={pending}>
          Annuler
        </Button>
        <Button onClick={onSubmit} disabled={pending}>
          {pending ? pendingLabel : submitLabel}
        </Button>
      </div>
    </div>
  );
}
