import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { PERMISSION_GROUPS } from "@/lib/permissions/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import RolesClient from "./client";

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  await requirePermission("admin.roles.manage");
  const roles = await prisma.role.findMany({
    orderBy: { code: "asc" },
    include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } },
  });
  const allPerms = await prisma.permission.findMany();
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Roles et permissions</h1>
        <RolesClient mode="create" allPerms={allPerms} />
      </div>
      {roles.map((r) => (
        <Card key={r.id}>
          <CardHeader className="flex flex-row justify-between items-center">
            <div>
              <CardTitle>
                {r.name} <span className="text-sm font-normal text-muted-foreground">({r.code})</span>
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {r._count.users} utilisateur(s) - {r.permissions.length} permission(s)
                {r.isSystem && <span className="ml-2 italic">[Role systeme]</span>}
              </p>
            </div>
            <RolesClient
              mode="edit"
              allPerms={allPerms}
              role={{
                id: r.id,
                code: r.code,
                name: r.name,
                description: r.description ?? "",
                isSystem: r.isSystem,
                permKeys: r.permissions.map((p) => p.permission.key),
              }}
            />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              {Object.entries(PERMISSION_GROUPS).map(([mod, perms]) => {
                const granted = perms.filter((p) => r.permissions.some((rp) => rp.permission.key === p.key));
                if (granted.length === 0) return null;
                return (
                  <div key={mod} className="border rounded p-2">
                    <div className="font-semibold uppercase text-[10px] text-muted-foreground mb-1">{mod}</div>
                    <ul>
                      {granted.map((p) => (
                        <li key={p.key}>- {p.description}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
