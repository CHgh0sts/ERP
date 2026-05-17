import { requirePermission } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BackupClient from "./client";

export default async function BackupPage() {
  await requirePermission("admin.backup.manage");
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Sauvegardes</h1>
      <Card>
        <CardHeader>
          <CardTitle>Sauvegarde complete</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Cree une archive ZIP contenant la base SQLite et tous les fichiers (datasheets, logos, PDFs).
            Conservez cette archive dans un endroit sur.
          </p>
          <BackupClient />
        </CardContent>
      </Card>
    </div>
  );
}
