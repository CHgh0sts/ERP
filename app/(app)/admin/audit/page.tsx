import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ entity?: string; limit?: string }> }) {
  await requirePermission("admin.audit.read");
  const sp = await searchParams;
  const limit = Math.min(Number(sp.limit) || 200, 1000);
  const where = sp.entity ? { entity: sp.entity } : {};
  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { at: "desc" },
    take: limit,
    include: { user: true },
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Journal d&apos;audit</h1>
      <Card>
        <CardHeader>
          <CardTitle>{logs.length} dernieres entrees</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entite</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="whitespace-nowrap text-xs">{formatDateTime(l.at)}</TableCell>
                  <TableCell className="text-sm">{l.user?.name ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={l.action.startsWith("DELETE") ? "destructive" : "secondary"}>{l.action}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{l.entity}</TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">{l.entityId ?? "-"}</TableCell>
                  <TableCell className="text-xs max-w-lg truncate">{l.diff ?? ""}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
