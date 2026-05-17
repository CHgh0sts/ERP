"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/alert";
import { KeyRound, Copy, Check, Trash2, RefreshCw } from "lucide-react";
import { adminCreateResetLink, adminRevokeResetToken } from "./actions";

export function GenerateResetLinkButton({
  userId,
  label,
  variant = "create",
}: {
  userId: string;
  label: string;
  variant?: "create" | "regenerate";
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [link, setLink] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function generate() {
    setError(null);
    setLink(null);
    setCopied(false);
    start(async () => {
      try {
        const r = await adminCreateResetLink(userId);
        setLink(r.url);
        setExpiresAt(r.expiresAt);
        setOpen(true);
      } catch (e) {
        setError((e as Error).message);
        setOpen(true);
      }
    });
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback : select
    }
  }

  function close() {
    setOpen(false);
    setLink(null);
    setExpiresAt(null);
    setError(null);
  }

  return (
    <>
      <Button
        size="sm"
        variant={variant === "regenerate" ? "outline" : "default"}
        onClick={generate}
        disabled={pending}
        title={variant === "regenerate" ? "Regenerer le lien" : "Generer un lien"}
      >
        {variant === "regenerate" ? (
          <RefreshCw className="h-3.5 w-3.5" />
        ) : (
          <>
            <KeyRound className="h-3.5 w-3.5" /> Generer
          </>
        )}
      </Button>

      <Modal
        open={open}
        onClose={close}
        title="Lien de reinitialisation"
        description={`Pour : ${label}`}
        size="lg"
        footer={
          <Button onClick={close} variant="outline">
            Fermer
          </Button>
        }
      >
        <div className="space-y-4">
          {error && (
            <Alert variant="destructive" title="Erreur">
              {error}
            </Alert>
          )}
          {link && (
            <>
              <Alert variant="warning" title="Lien a usage unique">
                Ce lien ne sera affiche qu&apos;une seule fois. Copiez-le et transmettez-le a
                l&apos;utilisateur par un canal sur.
              </Alert>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">URL de reinitialisation</label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={link}
                    onFocus={(e) => e.currentTarget.select()}
                    className="flex-1 h-10 rounded-md border border-input bg-muted/40 px-3 text-xs font-mono"
                  />
                  <Button onClick={copy} variant={copied ? "success" : "default"}>
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" /> Copie
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" /> Copier
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {expiresAt && (
                <p className="text-xs text-muted-foreground">
                  Expire le {new Date(expiresAt).toLocaleString("fr-FR")}
                </p>
              )}
            </>
          )}
        </div>
      </Modal>
    </>
  );
}

export function RevokeButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function revoke() {
    if (!confirm("Revoquer ce lien ?")) return;
    setErr(null);
    start(async () => {
      try {
        await adminRevokeResetToken(id);
      } catch (e) {
        setErr((e as Error).message);
      }
    });
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      className="text-destructive hover:bg-destructive/10"
      onClick={revoke}
      disabled={pending}
      title={err ?? "Revoquer"}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}
