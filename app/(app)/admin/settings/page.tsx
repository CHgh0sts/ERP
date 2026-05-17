import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import SettingsForm from "./form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requirePermission("admin.settings.manage");
  const [cfg, company] = await Promise.all([
    prisma.appConfig.findUnique({ where: { id: 1 } }),
    prisma.company.findFirst(),
  ]);
  if (!cfg || !company) return <div>Configuration introuvable</div>;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Parametres</h1>
      <SettingsForm
        cfg={{
          articleCodePrefix: cfg.articleCodePrefix,
          articleCodePadding: cfg.articleCodePadding,
          uniqueCodePrefix: cfg.uniqueCodePrefix,
          uniqueCodePadding: cfg.uniqueCodePadding,
          ofCodePrefix: cfg.ofCodePrefix,
          ofCodePadding: cfg.ofCodePadding,
          invoiceCodePrefix: cfg.invoiceCodePrefix,
          invoiceCodePadding: cfg.invoiceCodePadding,
          defaultStockAlert: cfg.defaultStockAlert,
          timezone: cfg.timezone,
          language: cfg.language,
        }}
        company={{
          id: company.id,
          name: company.name,
          siret: company.siret ?? "",
          vatNumber: company.vatNumber ?? "",
          address: company.address ?? "",
          postalCode: company.postalCode ?? "",
          city: company.city ?? "",
          country: company.country,
          phone: company.phone ?? "",
          email: company.email ?? "",
          currency: company.currency,
          fiscalYearStart: company.fiscalYearStart.toISOString().slice(0, 10),
          fiscalYearEnd: company.fiscalYearEnd.toISOString().slice(0, 10),
        }}
      />
    </div>
  );
}
