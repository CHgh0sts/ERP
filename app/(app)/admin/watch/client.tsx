"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/alert";
import { Plus, Pencil, Trash2, Play } from "lucide-react";
import {
  createWatchFolder,
  updateWatchFolder,
  deleteWatchFolder,
  toggleWatchFolder,
  scanWatchFolderNow,
} from "./actions";

type WF = {
  id: string;
  name: string;
  path: string;
  fileType: string;
  entity: string;
  enabled: boolean;
  pollIntervalSec: number;
  csvDelimiter: string;
  fieldMapping: string | null;
  processedSubdir: string;
  errorSubdir: string;
};

const EMPTY: WF = {
  id: "",
  name: "",
  path: "",
  fileType: "csv",
  entity: "article",
  enabled: true,
  pollIntervalSec: 60,
  csvDelimiter: ",",
  fieldMapping: "",
  processedSubdir: ".processed",
  errorSubdir: ".errors",
};

function Form({
  mode,
  initial,
  open,
  onClose,
}: {
  mode: "create" | "edit";
  initial: WF;
  open: boolean;
  onClose: () => void;
}) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [f, setF] = useState<WF>(initial);

  function submit() {
    setErr(null);
    start(async () => {
      try {
        const payload = {
          name: f.name,
          path: f.path,
          fileType: f.fileType as "csv" | "json",
          entity: f.entity as "article",
          enabled: f.enabled,
          pollIntervalSec: f.pollIntervalSec,
          csvDelimiter: f.csvDelimiter,
          fieldMapping: f.fieldMapping || null,
          processedSubdir: f.processedSubdir,
          errorSubdir: f.errorSubdir,
        };
        if (mode === "create") await createWatchFolder(payload);
        else await updateWatchFolder(f.id, payload);
        onClose();
      } catch (e) {
        setErr((e as Error).message);
      }
    });
  }

  return (
    <Modal
      open={open}
      onClose={() => !pending && onClose()}
      title={mode === "create" ? "Ajouter un dossier d'ecoute" : "Modifier le dossier"}
      description="Les fichiers CSV/JSON deposes dans ce dossier seront importes automatiquement."
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {err && <Alert variant="destructive" title="Erreur">{err}</Alert>}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Nom <span className="text-destructive">*</span></Label>
            <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ex : Import Mouser" />
          </div>
          <div className="space-y-1.5">
            <Label>Entite</Label>
            <Select value={f.entity} onChange={(e) => setF({ ...f, entity: e.target.value })}>
              <option value="article">Articles (composants)</option>
            </Select>
          </div>

          <div className="col-span-2 space-y-1.5">
            <Label>Chemin du dossier <span className="text-destructive">*</span></Label>
            <Input
              value={f.path}
              onChange={(e) => setF({ ...f, path: e.target.value })}
              placeholder="C:\imports\composants  ou  ./imports/composants"
            />
            <p className="text-xs text-muted-foreground">
              Chemin absolu ou relatif au dossier de l&apos;application. Le dossier sera cree s&apos;il
              n&apos;existe pas.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Type de fichier</Label>
            <Select value={f.fileType} onChange={(e) => setF({ ...f, fileType: e.target.value })}>
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Intervalle de scan (sec)</Label>
            <Input
              type="number"
              min={5}
              value={f.pollIntervalSec}
              onChange={(e) => setF({ ...f, pollIntervalSec: Number(e.target.value) || 60 })}
            />
          </div>

          {f.fileType === "csv" && (
            <div className="space-y-1.5">
              <Label>Separateur CSV</Label>
              <Select value={f.csvDelimiter} onChange={(e) => setF({ ...f, csvDelimiter: e.target.value })}>
                <option value=",">Virgule (,)</option>
                <option value=";">Point-virgule (;)</option>
                <option value={"\t"}>Tabulation</option>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Statut</Label>
            <label className="flex items-center gap-2 h-10 px-3 rounded-md border border-input bg-card text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={f.enabled}
                onChange={(e) => setF({ ...f, enabled: e.target.checked })}
                className="h-4 w-4 accent-primary"
              />
              Actif (scan automatique)
            </label>
          </div>

          <div className="space-y-1.5">
            <Label>Sous-dossier fichiers traites</Label>
            <Input
              value={f.processedSubdir}
              onChange={(e) => setF({ ...f, processedSubdir: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Sous-dossier erreurs</Label>
            <Input
              value={f.errorSubdir}
              onChange={(e) => setF({ ...f, errorSubdir: e.target.value })}
            />
          </div>

          <div className="col-span-2 space-y-1.5">
            <Label>
              Mapping des colonnes <span className="text-muted-foreground font-normal">(JSON, optionnel)</span>
            </Label>
            <Textarea
              rows={5}
              value={f.fieldMapping ?? ""}
              onChange={(e) => setF({ ...f, fieldMapping: e.target.value })}
              placeholder={'{\n  "codearticle": "MyPartNumber",\n  "description": "Description",\n  "mpn": "ManufacturerPN",\n  "lastpurchaseprice": "UnitPrice"\n}'}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Associe les champs internes (gauche) aux noms de colonnes du fichier (droite). Laissez vide si
              vos en-tetes correspondent deja aux noms internes : codearticle, mpn, description, componenttype,
              format, value, stockalert, lastpurchaseprice, notes.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function CreateButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Ajouter un dossier
      </Button>
      <Form mode="create" initial={EMPTY} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function RowActions({ folder }: { folder: WF }) {
  const [editOpen, setEditOpen] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [scanMsg, setScanMsg] = useState<string | null>(null);

  function onScan() {
    setErr(null);
    setScanMsg(null);
    start(async () => {
      try {
        const r = await scanWatchFolderNow(folder.id);
        setScanMsg(r.summary.message);
      } catch (e) {
        setErr((e as Error).message);
      }
    });
  }

  function onToggle() {
    start(async () => {
      try {
        await toggleWatchFolder(folder.id, !folder.enabled);
      } catch (e) {
        setErr((e as Error).message);
      }
    });
  }

  function onDelete() {
    if (!confirm(`Supprimer le dossier "${folder.name}" ?`)) return;
    start(async () => {
      try {
        await deleteWatchFolder(folder.id);
      } catch (e) {
        setErr((e as Error).message);
      }
    });
  }

  return (
    <div className="flex justify-end gap-1.5 items-center">
      {scanMsg && <span className="text-xs text-success max-w-[200px] truncate" title={scanMsg}>{scanMsg}</span>}
      {err && <span className="text-xs text-destructive max-w-[200px] truncate" title={err}>{err}</span>}
      <Button size="sm" variant="outline" onClick={onScan} disabled={pending} title="Scanner maintenant">
        <Play className="h-3.5 w-3.5" />
      </Button>
      <Button size="sm" variant="ghost" onClick={onToggle} disabled={pending}>
        {folder.enabled ? "Desactiver" : "Activer"}
      </Button>
      <Button size="sm" variant="outline" onClick={() => setEditOpen(true)} disabled={pending}>
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={onDelete}
        disabled={pending}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
      <Form mode="edit" initial={folder} open={editOpen} onClose={() => setEditOpen(false)} />
    </div>
  );
}

