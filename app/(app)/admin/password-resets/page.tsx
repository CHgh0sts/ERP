import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { GenerateResetLinkButton, RevokeButton } from "./client";

export const dynamic = "force-dynamic";

export default async function PasswordResetsPage() {
  await requirePermission("admin.users.manage");

  const users = await prisma.user.findMany({
    where: { isActive: true },
    orderBy: [{ name: "asc" }],
    select: { id: true, name: true, email: true },
  });

  const now = new Date();
  const pending = await prisma.passwordResetToken.findMany({
    where: { usedAt: null, expiresAt: { gt: now } },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, email: true } } },
  });

  const recent = await prisma.passwordResetToken.findMany({
    where: { OR: [{ usedAt: { not: null } }, { expiresAt: { lt: now } }] },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { user: { select: { name: true, email: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reinitialisations de mot de passe</h1>
        <p className="text-sm text-muted-foreground">
          Generez des liens a usage unique et communiquez-les aux utilisateurs. Les liens expirent
          apres 1h.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generer un lien</CardTitle>
          <CardDescription>
            Selectionnez un utilisateur et copiez le lien. Le token en clair n&apos;est affiche
            qu&apos;une seule fois.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell className="text-right">
                    <GenerateResetLinkButton userId={u.id} label={u.email} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Demandes en attente</CardTitle>
          <CardDescription>
            {pending.length === 0
              ? "Aucune demande active."
              : `${pending.length} lien(s) valide(s).`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Origine</TableHead>
                <TableHead>Cree le</TableHead>
                <TableHead>Expire le</TableHead>
                <TableHead>IP</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                    Aucune demande en attente
                  </TableCell>
                </TableRow>
              ) : (
                pending.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div className="font-medium">{t.user.name}</div>
                      <div className="text-xs text-muted-foreground">{t.user.email}</div>
                    </TableCell>
                    <TableCell>
                      {t.createdBy ? (
                        <Badge variant="info">Admin</Badge>
                      ) : (
                        <Badge variant="warning">Auto (oubli)</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{formatDateTime(t.createdAt)}</TableCell>
                    <TableCell className="text-xs">{formatDateTime(t.expiresAt)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {t.requestedIp ?? "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <GenerateResetLinkButton
                          userId={t.userId}
                          label={t.user.email}
                          variant="regenerate"
                        />
                        <RevokeButton id={t.id} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historique recent</CardTitle>
          <CardDescription>20 derniers liens utilises ou expires.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Cree le</TableHead>
                <TableHead>Expire le</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                    Aucun historique
                  </TableCell>
                </TableRow>
              ) : (
                recent.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div className="font-medium">{t.user.name}</div>
                      <div className="text-xs text-muted-foreground">{t.user.email}</div>
                    </TableCell>
                    <TableCell className="text-xs">{formatDateTime(t.createdAt)}</TableCell>
                    <TableCell className="text-xs">{formatDateTime(t.expiresAt)}</TableCell>
                    <TableCell>
                      {t.usedAt ? (
                        <Badge variant="success">Utilise</Badge>
                      ) : (
                        <Badge variant="secondary">Expire</Badge>
                      )}
                    </TableCell>
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
