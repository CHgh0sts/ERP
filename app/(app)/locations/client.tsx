"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/alert";
import { CrudModalFooter } from "@/components/ui/crud-modal-footer";
import { Plus, Pencil } from "lucide-react";
import { createLocation, updateLocation, deleteLocation } from "./actions";

type Loc = { id: string; code: string; name: string; parentId?: string };

export default function LocationsClient(props: {
  mode: "create" | "edit";
  location?: Loc;
  allLocations: Array<{ id: string; code: string; name: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [code, setCode] = useState(props.location?.code ?? "");
  const [name, setName] = useState(props.location?.name ?? "");
  const [parentId, setParentId] = useState(props.location?.parentId ?? "");

  async function submit() {
    setErr(null);
    start(async () => {
      try {
        if (props.mode === "create") {
          await createLocation({ code, name, parentId: parentId || null });
        } else if (props.location) {
          await updateLocation(props.location.id, { code, name, parentId: parentId || null });
        }
        setOpen(false);
      } catch (e) {
        setErr((e as Error).message);
      }
    });
  }

  async function onDelete() {
    if (!props.location) return;
    if (!confirm("Supprimer cet emplacement ?")) return;
    start(async () => {
      try {
        await deleteLocation(props.location!.id);
        setOpen(false);
      } catch (e) {
        setErr((e as Error).message);
      }
    });
  }

  return (
    <>
      <Button size="sm" variant={props.mode === "create" ? "default" : "ghost"} onClick={() => setOpen(true)}>
        {props.mode === "create" ? (
          <>
            <Plus className="h-4 w-4" /> Nouvel emplacement
          </>
        ) : (
          <>
            <Pencil className="h-3.5 w-3.5" /> Modifier
          </>
        )}
      </Button>

      <Modal
        open={open}
        onClose={() => !pending && setOpen(false)}
        title={props.mode === "create" ? "Nouvel emplacement" : "Modifier l'emplacement"}
        size="md"
        footer={
          <CrudModalFooter
            pending={pending}
            onClose={() => setOpen(false)}
            onSubmit={submit}
            onDelete={props.mode === "edit" ? onDelete : undefined}
          />
        }
      >
        <div className="space-y-4">
          {err && (
            <Alert variant="destructive" title="Erreur">
              {err}
            </Alert>
          )}
          <div className="space-y-1.5">
            <Label>Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Nom</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Parent (optionnel)</Label>
            <Select value={parentId} onChange={(e) => setParentId(e.target.value)}>
              <option value="">(racine)</option>
              {props.allLocations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.code} - {l.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Modal>
    </>
  );
}
