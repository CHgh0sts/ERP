import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { CreateButton, RowActions } from "./client";

export const dynamic = "force-dynamic";

export default async function WatchFoldersPage() {
  await requirePermission("admin.watch.manage");
  const folders = await prisma.watchFolder.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { runs: true } },
    },
  });

  const recentRuns = await prisma.watchRun.findMany({
    orderBy: { at: "desc" },
    take: 20,
    include: {
      watchFolder: { select: { name: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dossiers d&apos;ecoute</h1>
          <p className="text-sm text-muted-foreground">
            Importez automatiquement les composants depuis des fichiers CSV/JSON deposes dans un dossier.
          </p>
        </div>
        <CreateButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dossiers configures</CardTitle>
          <CardDescription>
            {folders.length === 0
              ? "Aucun dossier pour le moment. Cliquez sur \"Ajouter un dossier\" pour en creer un."
              : `${folders.length} dossier(s) configure(s).`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Chemin</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Entite</TableHead>
                <TableHead>Interv.</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Dernier scan</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {folders.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.name}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{f.path}</code>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{f.fileType.toUpperCase()}</Badge>
                  </TableCell>
                  <TableCell>{f.entity}</TableCell>
                  <TableCell>{f.pollIntervalSec}s</TableCell>
                  <TableCell>
                    {f.enabled ? (
                      <Badge variant="success">Actif</Badge>
                    ) : (
                      <Badge variant="secondary">Desactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {f.lastScanAt ? (
                      <>
                        <div>{formatDateTime(f.lastScanAt)}</div>
                        <div className="truncate max-w-[280px]">{f.lastResult}</div>
                      </>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <RowActions folder={toClient(f)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historique recent</CardTitle>
          <CardDescription>Les 20 derniers fichiers traites.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quand</TableHead>
                <TableHead>Dossier</TableHead>
                <TableHead>Fichier</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Crees</TableHead>
                <TableHead>Erreurs</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentRuns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                    Aucun historique
                  </TableCell>
                </TableRow>
              ) : (
                recentRuns.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs whitespace-nowrap">{formatDateTime(r.at)}</TableCell>
                    <TableCell>{r.watchFolder.name}</TableCell>
                    <TableCell className="font-mono text-xs">{r.file}</TableCell>
                    <TableCell>
                      {r.status === "success" && <Badge variant="success">OK</Badge>}
                      {r.status === "partial" && <Badge variant="warning">Partiel</Badge>}
                      {r.status === "error" && <Badge variant="destructive">Erreur</Badge>}
                    </TableCell>
                    <TableCell>{r.createdCount}</TableCell>
                    <TableCell>{r.errorCount}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-md truncate">{r.message}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function toClient(f: {
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
}) {
  return {
    id: f.id,
    name: f.name,
    path: f.path,
    fileType: f.fileType,
    entity: f.entity,
    enabled: f.enabled,
    pollIntervalSec: f.pollIntervalSec,
    csvDelimiter: f.csvDelimiter,
    fieldMapping: f.fieldMapping,
    processedSubdir: f.processedSubdir,
    errorSubdir: f.errorSubdir,
  };
}
