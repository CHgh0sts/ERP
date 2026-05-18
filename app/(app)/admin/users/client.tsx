"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/alert";
import { CrudModalFooter } from "@/components/ui/crud-modal-footer";
import { Plus, Pencil } from "lucide-react";
import { createUserAction, updateUserAction, deleteUserAction } from "./actions";

type Role = { id: string; code: string; name: string };
type UserLite = { id: string; name: string; email: string; isActive: boolean; roleIds: string[] };

export default function UsersClient(props: { mode: "create" | "edit"; user?: UserLite; roles: Role[] }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const [name, setName] = useState(props.user?.name ?? "");
  const [email, setEmail] = useState(props.user?.email ?? "");
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(props.user?.isActive ?? true);
  const [roleIds, setRoleIds] = useState<string[]>(props.user?.roleIds ?? []);

  function toggleRole(id: string) {
    setRoleIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function submit() {
    setErr(null);
    start(async () => {
      try {
        if (props.mode === "create") {
          await createUserAction({ name, email, password, roleIds });
        } else if (props.user) {
          await updateUserAction({
            id: props.user.id,
            name,
            email,
            isActive,
            roleIds,
            password: password || null,
          });
        }
        setOpen(false);
        setPassword("");
      } catch (e) {
        setErr((e as Error).message);
      }
    });
  }

  async function onDelete() {
    if (!props.user) return;
    if (!confirm("Supprimer cet utilisateur ?")) return;
    start(async () => {
      try {
        await deleteUserAction(props.user!.id);
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
            <Plus className="h-4 w-4" /> Nouvel utilisateur
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
        title={props.mode === "create" ? "Nouvel utilisateur" : "Modifier"}
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
          <div>
            <Label>Nom</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>{props.mode === "create" ? "Mot de passe" : "Nouveau mot de passe (optionnel)"}</Label>
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {props.mode === "edit" && (
            <div className="flex items-center gap-2">
              <input
                id="active"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <Label htmlFor="active">Compte actif</Label>
            </div>
          )}
          <div>
            <Label>Roles</Label>
            <div className="mt-1 space-y-1">
              {props.roles.map((r) => (
                <label key={r.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={roleIds.includes(r.id)} onChange={() => toggleRole(r.id)} />
                  {r.name} <span className="text-muted-foreground">({r.code})</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
