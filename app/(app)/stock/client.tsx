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
import { createStockUnit, adjustStock } from "./actions";

type Loc = { id: string; code: string; name: string };
type Art = { id: string; codeArticle: string; description: string };

type UnitLite = { id: string; codeUnique: string; articleName: string; qtyOnHand: number; locationId: string };

export default function StockClient(props: {
  mode: "create" | "adjust";
  stockUnit?: UnitLite;
  locations: Loc[];
  articles: Art[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const [articleId, setArticleId] = useState(props.articles[0]?.id ?? "");
  const [locationId, setLocationId] = useState(props.locations[0]?.id ?? "");
  const [qty, setQty] = useState("0");
  const [lot, setLot] = useState("");
  const [state, setState] = useState("UNITAIRE");

  const [type, setType] = useState<"IN" | "OUT" | "ADJUST" | "TRANSFER">("IN");
  const [adjQty, setAdjQty] = useState("0");
  const [toLoc, setToLoc] = useState(props.stockUnit?.locationId || "");
  const [reason, setReason] = useState("");

  async function submitCreate() {
    setErr(null);
    start(async () => {
      try {
        await createStockUnit({
          articleId,
          locationId: locationId || null,
          qtyOnHand: Number(qty) || 0,
          lotNumber: lot || null,
          packagingState: state,
        });
        setOpen(false);
      } catch (e) {
        setErr((e as Error).message);
      }
    });
  }

  async function submitAdjust() {
    if (!props.stockUnit) return;
    setErr(null);
    start(async () => {
      try {
        await adjustStock({
          stockUnitId: props.stockUnit!.id,
          type,
          qty: Number(adjQty) || 0,
          toLocationId: type === "TRANSFER" ? toLoc : null,
          reason: reason || null,
        });
        setOpen(false);
      } catch (e) {
        setErr((e as Error).message);
      }
    });
  }

  const submit = props.mode === "create" ? submitCreate : submitAdjust;

  return (
    <>
      <Button size="sm" variant={props.mode === "create" ? "default" : "outline"} onClick={() => setOpen(true)}>
        {props.mode === "create" ? (
          <>
            <Plus className="h-4 w-4" /> Nouvelle unite
          </>
        ) : (
          <>
            <Pencil className="h-3.5 w-3.5" /> Mouvement
          </>
        )}
      </Button>

      <Modal
        open={open}
        onClose={() => !pending && setOpen(false)}
        title={props.mode === "create" ? "Nouvelle unite de stock" : "Mouvement de stock"}
        size="lg"
        footer={
          <CrudModalFooter pending={pending} onClose={() => setOpen(false)} onSubmit={submit} />
        }
      >
        <div className="space-y-4">
          {err && (
            <Alert variant="destructive" title="Erreur">
              {err}
            </Alert>
          )}
          {props.mode === "create" ? (
            <>
              <div>
                <Label>Article</Label>
                <Select value={articleId} onChange={(e) => setArticleId(e.target.value)}>
                  {props.articles.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.codeArticle} - {a.description}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Emplacement</Label>
                <Select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                  <option value="">(non affecte)</option>
                  {props.locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.code} - {l.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Quantite</Label>
                  <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
                </div>
                <div>
                  <Label>Conditionnement</Label>
                  <Select value={state} onChange={(e) => setState(e.target.value)}>
                    <option value="UNITAIRE">Unitaire</option>
                    <option value="REEL">Reel</option>
                    <option value="BOBINE">Bobine</option>
                    <option value="BANDE">Bande</option>
                    <option value="RESTE">Reste</option>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Lot</Label>
                <Input value={lot} onChange={(e) => setLot(e.target.value)} />
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {props.stockUnit?.codeUnique} - {props.stockUnit?.articleName} (qte actuelle {props.stockUnit?.qtyOnHand})
              </p>
              <div>
                <Label>Type</Label>
                <Select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
                  <option value="IN">Entree</option>
                  <option value="OUT">Sortie</option>
                  <option value="ADJUST">Ajustement (qte absolue)</option>
                  <option value="TRANSFER">Transfert</option>
                </Select>
              </div>
              <div>
                <Label>{type === "ADJUST" ? "Nouvelle qte" : "Quantite"}</Label>
                <Input type="number" value={adjQty} onChange={(e) => setAdjQty(e.target.value)} />
              </div>
              {type === "TRANSFER" && (
                <div>
                  <Label>Vers emplacement</Label>
                  <Select value={toLoc} onChange={(e) => setToLoc(e.target.value)}>
                    <option value="">(aucun)</option>
                    {props.locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.code} - {l.name}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
              <div>
                <Label>Motif</Label>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
