"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PERMISSION_GROUPS } from "@/lib/permissions/constants";
import { createRoleAction, updateRoleAction, deleteRoleAction } from "./actions";

type Perm = { id: string; key: string; module: string; description: string };
type Role = { id: string; code: string; name: string; description: string; isSystem: boolean; permKeys: string[] };

export default function RolesClient(props: { mode: "create" | "edit"; role?: Role; allPerms: Perm[] }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const [code, setCode] = useState(props.role?.code ?? "");
  const [name, setName] = useState(props.role?.name ?? "");
  const [desc, setDesc] = useState(props.role?.description ?? "");
  const [perms, setPerms] = useState<string[]>(props.role?.permKeys ?? []);

  const isAdmin = props.role?.code === "ADMIN";

  function toggle(key: string) {
    setPerms((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));
  }

  function toggleGroup(keys: string[], on: boolean) {
    setPerms((prev) => (on ? Array.from(new Set([...prev, ...keys])) : prev.filter((p) => !keys.includes(p))));
  }

  async function submit() {
    setErr(null);
    start(async () => {
      try {
        if (props.mode === "create") {
          await createRoleAction({ code: code.toUpperCase(), name, description: desc, permKeys: perms });
        } else if (props.role) {
          await updateRoleAction({ id: props.role.id, name, description: desc, permKeys: perms });
        }
        setOpen(false);
      } catch (e) {
        setErr((e as Error).message);
      }
    });
  }

  async function onDelete() {
    if (!props.role) return;
    if (!confirm("Supprimer ce role ?")) return;
    start(async () => {
      try {
        await deleteRoleAction(props.role!.id);
        setOpen(false);
      } catch (e) {
        setErr((e as Error).message);
      }
    });
  }

  if (!open) {
    return (
      <Button size="sm" variant={props.mode === "create" ? "default" : "outline"} onClick={() => setOpen(true)}>
        {props.mode === "create" ? "+ Nouveau role" : "Modifier"}
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-background rounded-lg p-6 w-full max-w-3xl space-y-3 max-h-[90vh] overflow-y-auto">
        <h3 className="font-bold text-lg">
          {props.mode === "create" ? "Nouveau role" : `Modifier : ${props.role?.name}`}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Code (UPPER_CASE)</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              disabled={props.mode === "edit"}
            />
          </div>
          <div>
            <Label>Nom</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Description</Label>
          <Textarea rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
        <div className="space-y-3">
          <Label>Permissions {isAdmin && <span className="text-xs text-muted-foreground">(verrouille pour ADMIN)</span>}</Label>
          {Object.entries(PERMISSION_GROUPS).map(([mod, items]) => {
            const keys = items.map((i) => i.key);
            const allOn = keys.every((k) => perms.includes(k));
            return (
              <div key={mod} className="border rounded p-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="uppercase text-xs font-bold text-muted-foreground">{mod}</span>
                  <label className="text-xs flex items-center gap-1">
                    <input
                      type="checkbox"
                      disabled={isAdmin}
                      checked={allOn}
                      onChange={(e) => toggleGroup(keys, e.target.checked)}
                    />
                    Tous
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-1 text-sm">
                  {items.map((p) => (
                    <label key={p.key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        disabled={isAdmin}
                        checked={perms.includes(p.key)}
                        onChange={() => toggle(p.key)}
                      />
                      {p.description}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <div className="flex justify-between border-t pt-3">
          <div>
            {props.mode === "edit" && !props.role?.isSystem && (
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
