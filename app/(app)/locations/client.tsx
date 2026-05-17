"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
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

  if (!open) {
    return (
      <Button size="sm" variant={props.mode === "create" ? "default" : "ghost"} onClick={() => setOpen(true)}>
        {props.mode === "create" ? "+ Nouvel emplacement" : "Modifier"}
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg p-6 w-full max-w-md space-y-3">
        <h3 className="font-bold text-lg">{props.mode === "create" ? "Nouvel emplacement" : "Modifier"}</h3>
        <div>
          <Label>Code</Label>
          <Input value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        <div>
          <Label>Nom</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
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
        {err && <p className="text-sm text-destructive">{err}</p>}
        <div className="flex justify-between border-t pt-2">
          <div>
            {props.mode === "edit" && (
              <Button variant="destructive" size="sm" onClick={onDelete} disabled={pending}>
                Supprimer
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Annuler
            </Button>
            <Button onClick={submit} disabled={pending}>
              {pending ? "..." : "Enregistrer"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
