import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { AccountClient } from "./client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mon compte - ERP" };

export default async function AccountPage() {
  const u = await requireUser();

  const full = await prisma.user.findUnique({
    where: { id: u.uid },
    include: { roles: { include: { role: true } } },
  });

  if (!full) {
    return <div>Utilisateur introuvable.</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mon compte</h1>
        <p className="text-sm text-muted-foreground">
          Gerez vos informations personnelles, vos preferences d&apos;affichage et votre mot de
          passe.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations</CardTitle>
          <CardDescription>
            Votre email ne peut etre modifie que par un administrateur.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AccountClient
            user={{ id: full.id, name: full.name, email: full.email }}
          />
          <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Roles</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {full.roles.length === 0 ? (
                  <span className="text-muted-foreground">Aucun</span>
                ) : (
                  full.roles.map((ur) => (
                    <Badge
                      key={ur.role.id}
                      variant={ur.role.code === "ADMIN" ? "default" : "secondary"}
                    >
                      {ur.role.name}
                    </Badge>
                  ))
                )}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Derniere connexion</div>
              <div className="mt-1 font-medium">{formatDateTime(full.lastLoginAt)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Compte cree le</div>
              <div className="mt-1 font-medium">{formatDateTime(full.createdAt)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Statut</div>
              <div className="mt-1">
                <Badge variant={full.isActive ? "success" : "destructive"}>
                  {full.isActive ? "Actif" : "Inactif"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
