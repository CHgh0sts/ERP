"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/alert";
import { Plus, Upload, X as XIcon } from "lucide-react";
import {
  addArticleSupplier,
  deleteArticleSupplier,
  addEquivalence,
  deleteEquivalence,
  uploadDatasheet,
} from "../actions";

type SupplierLite = { id: string; name: string; code: string };
type ArticleLite = { id: string; codeArticle: string; description: string };

type Props = {
  articleId: string;
  hasDatasheet: boolean;
  datasheetFileId: string | null;
  datasheetName: string | null;
  suppliers: SupplierLite[];
  articles: ArticleLite[];
};

function Main(props: Props) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [sOpen, setSOpen] = useState(false);
  const [sSupplierId, setSSupplierId] = useState(props.suppliers[0]?.id ?? "");
  const [sRef, setSRef] = useState("");
  const [sPrice, setSPrice] = useState("0");
  const [sMoq, setSMoq] = useState("1");
  const [sPackaging, setSPackaging] = useState("");
  const [sLead, setSLead] = useState("0");
  const [sPref, setSPref] = useState(false);

  const [eOpen, setEOpen] = useState(false);
  const [eOther, setEOther] = useState(props.articles[0]?.id ?? "");
  const [eNote, setENote] = useState("");

  function resetSupplierForm() {
    setSRef("");
    setSPrice("0");
    setSMoq("1");
    setSPackaging("");
    setSLead("0");
    setSPref(false);
  }

  async function onUpload() {
    setErr(null);
    const f = fileRef.current?.files?.[0];
    if (!f) return;
    const fd = new FormData();
    fd.append("file", f);
    start(async () => {
      try {
        await uploadDatasheet(props.articleId, fd);
        if (fileRef.current) fileRef.current.value = "";
      } catch (e) {
        setErr((e as Error).message);
      }
    });
  }

  async function onAddSupplier() {
    setErr(null);
    start(async () => {
      try {
        await addArticleSupplier({
          articleId: props.articleId,
          supplierId: sSupplierId,
          supplierRef: sRef || null,
          priceHT: Number(sPrice) || 0,
          currency: "EUR",
          moq: Number(sMoq) || 1,
          packaging: sPackaging || null,
          leadTimeDays: Number(sLead) || 0,
          isPreferred: sPref,
        });
        setSOpen(false);
        resetSupplierForm();
      } catch (e) {
        setErr((e as Error).message);
      }
    });
  }

  async function onAddEquiv() {
    setErr(null);
    start(async () => {
      try {
        await addEquivalence(props.articleId, eOther, eNote);
        setEOpen(false);
        setENote("");
      } catch (e) {
        setErr((e as Error).message);
      }
    });
  }

  return (
    <div className="space-y-4">
      {err && (
        <Alert variant="destructive" title="Erreur">
          {err}
        </Alert>
      )}

      <div className="space-y-2">
        {props.hasDatasheet ? (
          <div className="flex items-center justify-between gap-3 p-3 rounded-md border border-border bg-muted/30">
            <div className="text-sm min-w-0">
              <div className="text-muted-foreground text-xs">Datasheet</div>
              <div className="font-medium truncate">{props.datasheetName}</div>
            </div>
            <Button asChild size="sm" variant="outline">
              <a href={`/api/files/${props.datasheetFileId}`} target="_blank" rel="noreferrer">
                Ouvrir
              </a>
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Aucune datasheet</p>
        )}
        <div className="flex gap-2 items-center">
          <input
            type="file"
            ref={fileRef}
            accept="application/pdf"
            className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-border file:bg-card file:text-foreground file:text-xs file:font-medium hover:file:bg-accent"
          />
          <Button size="sm" onClick={onUpload} disabled={pending} variant="outline">
            <Upload className="h-3.5 w-3.5" /> Uploader
          </Button>
        </div>
      </div>

      <div className="border-t border-border pt-4 flex flex-col gap-2 items-start">
        <Button size="sm" variant="outline" onClick={() => setSOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Ajouter un fournisseur
        </Button>
        <Button size="sm" variant="outline" onClick={() => setEOpen(true)} disabled={props.articles.length === 0}>
          <Plus className="h-3.5 w-3.5" /> Ajouter une equivalence
        </Button>
      </div>

      <Modal
        open={sOpen}
        onClose={() => !pending && setSOpen(false)}
        title="Ajouter un fournisseur"
        description="Associe cet article a un fournisseur avec son tarif et ses conditions."
        footer={
          <>
            <Button variant="outline" onClick={() => setSOpen(false)} disabled={pending}>
              Annuler
            </Button>
            <Button onClick={onAddSupplier} disabled={pending || !sSupplierId}>
              {pending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </>
        }
      >
        {props.suppliers.length === 0 ? (
          <Alert variant="warning" title="Aucun fournisseur">
            Cree d&apos;abord un fournisseur dans le module Fournisseurs.
          </Alert>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>
                Fournisseur <span className="text-destructive">*</span>
              </Label>
              <Select value={sSupplierId} onChange={(e) => setSSupplierId(e.target.value)}>
                {props.suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Ref. fournisseur</Label>
                <Input value={sRef} onChange={(e) => setSRef(e.target.value)} placeholder="Ex : 123-456" />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Prix HT <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={sPrice}
                  onChange={(e) => setSPrice(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>MOQ</Label>
                <Input type="number" value={sMoq} onChange={(e) => setSMoq(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Conditionnement</Label>
                <Input
                  value={sPackaging}
                  onChange={(e) => setSPackaging(e.target.value)}
                  placeholder="Reel, Tube, Bag..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Lead time (jours)</Label>
                <Input type="number" value={sLead} onChange={(e) => setSLead(e.target.value)} />
              </div>
              <label className="flex items-center gap-2 mt-7 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={sPref}
                  onChange={(e) => setSPref(e.target.checked)}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                Fournisseur prefere
              </label>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={eOpen}
        onClose={() => !pending && setEOpen(false)}
        title="Ajouter une equivalence"
        description="Associe cet article a un autre article considere comme equivalent."
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setEOpen(false)} disabled={pending}>
              Annuler
            </Button>
            <Button onClick={onAddEquiv} disabled={pending || !eOther}>
              {pending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </>
        }
      >
        {props.articles.length === 0 ? (
          <Alert variant="info" title="Aucun autre article disponible">
            Il n&apos;y a aucun autre article a associer.
          </Alert>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>
                Article equivalent <span className="text-destructive">*</span>
              </Label>
              <Select value={eOther} onChange={(e) => setEOther(e.target.value)}>
                {props.articles.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.codeArticle} - {a.description}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Note</Label>
              <Input
                value={eNote}
                onChange={(e) => setENote(e.target.value)}
                placeholder="Ex : Compatible pin-to-pin, tolerance superieure..."
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function DeleteSupplierButton({ asId, articleId }: { asId: string; articleId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      className="text-destructive hover:text-destructive hover:bg-destructive/10"
      onClick={() => {
        if (!confirm("Retirer ce fournisseur ?")) return;
        start(async () => {
          await deleteArticleSupplier(asId, articleId);
        });
      }}
      disabled={pending}
    >
      <XIcon className="h-3.5 w-3.5" /> Retirer
    </Button>
  );
}

function DeleteEquivButton({ eqId, articleId }: { eqId: string; articleId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
      onClick={() => {
        if (!confirm("Supprimer cette equivalence ?")) return;
        start(async () => {
          await deleteEquivalence(eqId, articleId);
        });
      }}
      disabled={pending}
      aria-label="Supprimer"
    >
      <XIcon className="h-3.5 w-3.5" />
    </Button>
  );
}

const Component = Object.assign(Main, { DeleteSupplierButton, DeleteEquivButton });
export default Component;
