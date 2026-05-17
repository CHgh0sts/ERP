import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import UsersClient from "./client";
import { GenerateResetLinkButton } from "../password-resets/client";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  await requirePermission("admin.users.manage");
  const [users, roles] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: { roles: { include: { role: true } } },
    }),
    prisma.role.findMany({ orderBy: { code: "asc" } }),
  ]);
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Utilisateurs</h1>
        <UsersClient mode="create" roles={roles} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{users.length} compte(s)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Derniere connexion</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell className="space-x-1">
                    {u.roles.map((ur) => (
                      <Badge key={ur.role.id} variant={ur.role.code === "ADMIN" ? "default" : "secondary"}>
                        {ur.role.code}
                      </Badge>
                    ))}
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.isActive ? "success" : "destructive"}>{u.isActive ? "Actif" : "Inactif"}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{formatDateTime(u.lastLoginAt)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1.5">
                      <UsersClient
                        mode="edit"
                        user={{
                          id: u.id,
                          name: u.name,
                          email: u.email,
                          isActive: u.isActive,
                          roleIds: u.roles.map((ur) => ur.roleId),
                        }}
                        roles={roles}
                      />
                      {u.isActive && (
                        <GenerateResetLinkButton userId={u.id} label={u.email} />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
