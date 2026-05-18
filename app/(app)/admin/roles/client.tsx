"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/alert";
import { CrudModalFooter } from "@/components/ui/crud-modal-footer";
import { Plus, Pencil } from "lucide-react";
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

  return (
    <>
      <Button size="sm" variant={props.mode === "create" ? "default" : "outline"} onClick={() => setOpen(true)}>
        {props.mode === "create" ? (
          <>
            <Plus className="h-4 w-4" /> Nouveau role
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
        title={props.mode === "create" ? "Nouveau role" : `Modifier : ${props.role?.name}`}
        size="xl"
        footer={
          <CrudModalFooter
            pending={pending}
            onClose={() => setOpen(false)}
            onSubmit={submit}
            onDelete={props.mode === "edit" && !props.role?.isSystem ? onDelete : undefined}
          />
        }
      >
        <div className="space-y-4">
          {err && (
            <Alert variant="destructive" title="Erreur">
              {err}
            </Alert>
          )}
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
        </div>
      </Modal>
    </>
  );
}
