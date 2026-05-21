"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { FileUp, Upload } from "lucide-react";
import { importArticlesCsv } from "./actions";

type ReportErr = { line: number; mpn?: string; description?: string; message: string };
type Report = { total: number; created: number; updated: number; errors: ReportErr[] };

export default function ImportCsvClient() {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [delimiter, setDelimiter] = useState<string>(",");
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setErr(null);
    setReport(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function close() {
    if (pending) return;
    setOpen(false);
    reset();
  }

  function onSubmit() {
    setErr(null);
    setReport(null);
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setErr("Selectionne un fichier CSV ou JSON d'abord.");
      return;
    }
    start(async () => {
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("delimiter", delimiter);
        if (overwriteExisting) fd.append("overwriteExisting", "true");
        const r = await importArticlesCsv(fd);
        setReport(r.report);
      } catch (e) {
        setErr((e as Error).message);
      }
    });
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FileUp className="h-4 w-4" /> Importer CSV
      </Button>

      <Modal
        open={open}
        onClose={close}
        title="Importer des composants"
        description="Depose un fichier CSV ou JSON. Une seule ligne ou des milliers, peu importe."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={close} disabled={pending}>
              {report ? "Fermer" : "Annuler"}
            </Button>
            {!report && (
              <Button onClick={onSubmit} disabled={pending}>
                <Upload className="h-4 w-4" />
                {pending ? "Import en cours..." : "Lancer l'import"}
              </Button>
            )}
            {report && (
              <Button onClick={reset}>Importer un autre fichier</Button>
            )}
          </>
        }
      >
        <div className="space-y-4">
          {err && (
            <Alert variant="destructive" title="Impossible d'importer">
              {err}
            </Alert>
          )}

          {!report && (
            <>
              <div className="space-y-1.5">
                <Label>Fichier (.csv / .json)</Label>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.json,.txt,text/csv,application/json,text/plain"
                  className="block w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-md file:border file:border-border file:bg-card file:text-foreground file:text-sm file:font-medium hover:file:bg-accent cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Separateur CSV (ignore pour JSON)</Label>
                <Select value={delimiter} onChange={(e) => setDelimiter(e.target.value)}>
                  <option value=",">Virgule (,)</option>
                  <option value=";">Point-virgule (;)</option>
                  <option value={"\t"}>Tabulation</option>
                </Select>
              </div>

              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={overwriteExisting}
                  onChange={(e) => setOverwriteExisting(e.target.checked)}
                />
                <span>
                  Ecraser les articles existants si le <b>codearticle</b> est deja utilise (met a jour description,
                  MPN, type, etc.).
                </span>
              </label>

              <Alert variant="info" title="Colonnes reconnues">
                <div className="text-xs leading-relaxed">
                  <p className="mb-1">
                    En-tetes attendues (en minuscules, ordre libre, toutes optionnelles sauf <b>description</b>) :
                  </p>
                  <code className="block bg-card border border-border rounded px-2 py-1 font-mono">
                    codearticle, mpn, description, componenttype, format, value, stockalert, lastpurchaseprice, notes
                  </code>
                  <p className="mt-2">
                    Si <b>codearticle</b> est vide, un code est genere automatiquement. Avec l&apos;option
                    &quot;Ecraser&quot;, un code existant met a jour l&apos;article au lieu de produire une erreur.
                    Les types acceptes : resistor, capacitor, inductor, ic, transistor, diode, connector, pcb,
                    mechanical, other (ou leur equivalent francais).
                  </p>
                </div>
              </Alert>
            </>
          )}

          {report && (
            <div className="space-y-3">
              <Alert
                variant={
                  report.errors.length === 0
                    ? "success"
                    : report.created + report.updated > 0
                      ? "warning"
                      : "destructive"
                }
                title={
                  report.errors.length === 0
                    ? "Import reussi"
                    : report.created + report.updated > 0
                      ? "Import partiel"
                      : "Aucun article importe"
                }
              >
                <div>
                  <b>{report.created}</b> cree(s), <b>{report.updated}</b> mis a jour sur <b>{report.total}</b>{" "}
                  ligne(s).
                  {report.errors.length > 0 && (
                    <>
                      {" "}
                      <b>{report.errors.length}</b> erreur(s).
                    </>
                  )}
                </div>
              </Alert>

              {report.errors.length > 0 && (
                <div className="border border-border rounded-md overflow-hidden">
                  <div className="bg-muted/70 px-3 py-2 text-xs font-semibold">Details des erreurs</div>
                  <div className="max-h-64 overflow-y-auto text-xs">
                    <table className="w-full">
                      <thead className="sticky top-0 bg-muted/60">
                        <tr className="text-left text-muted-foreground">
                          <th className="px-3 py-1.5 font-medium">Ligne</th>
                          <th className="px-3 py-1.5 font-medium">MPN</th>
                          <th className="px-3 py-1.5 font-medium">Description</th>
                          <th className="px-3 py-1.5 font-medium">Erreur</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.errors.slice(0, 200).map((e, i) => (
                          <tr key={i} className="border-t border-border">
                            <td className="px-3 py-1.5 font-mono">{e.line}</td>
                            <td className="px-3 py-1.5">{e.mpn || "-"}</td>
                            <td className="px-3 py-1.5 max-w-[200px] truncate">{e.description || "-"}</td>
                            <td className="px-3 py-1.5 text-destructive">{e.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {report.errors.length > 200 && (
                      <div className="px-3 py-2 text-muted-foreground">
                        ... et {report.errors.length - 200} autre(s).
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
