import { requirePermission } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TraceabilityClient from "./client";

export const dynamic = "force-dynamic";

export default async function TraceabilityPage() {
  await requirePermission("traceability.read");
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Tracabilite</h1>
      <Card>
        <CardHeader>
          <CardTitle>Recherche</CardTitle>
        </CardHeader>
        <CardContent>
          <TraceabilityClient />
        </CardContent>
      </Card>
    </div>
  );
}
