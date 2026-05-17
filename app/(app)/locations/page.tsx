import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LocationsClient from "./client";

export const dynamic = "force-dynamic";

export default async function LocationsPage() {
  await requirePermission("locations.read");
  const locations = await prisma.location.findMany({
    where: { deletedAt: null },
    orderBy: { code: "asc" },
    include: { _count: { select: { stockUnits: true, children: true } } },
  });

  type Node = { id: string; code: string; name: string; parentId: string | null; nbUnits: number; children: Node[] };
  const byId: Record<string, Node> = {};
  for (const l of locations) {
    byId[l.id] = { id: l.id, code: l.code, name: l.name, parentId: l.parentId, nbUnits: l._count.stockUnits, children: [] };
  }
  const roots: Node[] = [];
  for (const l of Object.values(byId)) {
    if (l.parentId && byId[l.parentId]) byId[l.parentId].children.push(l);
    else roots.push(l);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Emplacements</h1>
        <LocationsClient mode="create" allLocations={locations.map((l) => ({ id: l.id, code: l.code, name: l.name }))} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{locations.length} emplacement(s)</CardTitle>
        </CardHeader>
        <CardContent>
          {roots.length === 0 && <p className="text-sm text-muted-foreground">Aucun emplacement. Creez le premier.</p>}
          <ul className="text-sm space-y-1">
            {roots.map((r) => (
              <TreeNode key={r.id} node={r} level={0} allLocations={locations} />
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function TreeNode({
  node,
  level,
  allLocations,
}: {
  node: { id: string; code: string; name: string; parentId: string | null; nbUnits: number; children: Array<{ id: string; code: string; name: string; parentId: string | null; nbUnits: number; children: unknown[] }> };
  level: number;
  allLocations: Array<{ id: string; code: string; name: string }>;
}) {
  return (
    <li>
      <div className="flex items-center gap-2" style={{ paddingLeft: level * 20 }}>
        <span className="font-mono text-xs text-muted-foreground">{node.code}</span>
        <span className="font-medium">{node.name}</span>
        <span className="text-xs text-muted-foreground">({node.nbUnits} unites)</span>
        <LocationsClient
          mode="edit"
          location={{ id: node.id, code: node.code, name: node.name, parentId: node.parentId ?? "" }}
          allLocations={allLocations.filter((l) => l.id !== node.id)}
        />
      </div>
      {node.children.length > 0 && (
        <ul>
          {node.children.map((c) => (
            <TreeNode key={c.id} node={c as never} level={level + 1} allLocations={allLocations} />
          ))}
        </ul>
      )}
    </li>
  );
}
