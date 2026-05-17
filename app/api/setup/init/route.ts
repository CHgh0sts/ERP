import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma, ensureWal } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { invalidateSecretCache } from "@/lib/auth/jwt";
import { createSession } from "@/lib/auth/session";
import { ALL_PERMISSION_KEYS, DEFAULT_USER_PERMISSIONS, PERMISSIONS } from "@/lib/permissions/constants";
import { PCG_FR, STANDARD_JOURNALS } from "@/lib/accounting/pcg";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

const schema = z.object({
  admin: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
  }),
  company: z.object({
    name: z.string().min(1),
    siret: z.string().optional().nullable(),
    vatNumber: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    postalCode: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    country: z.string().default("France"),
    phone: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    currency: z.string().default("EUR"),
    fiscalYearStart: z.string(),
    fiscalYearEnd: z.string(),
  }),
  settings: z.object({
    articleCodePrefix: z.string().default("C"),
    articleCodePadding: z.coerce.number().int().min(3).max(10).default(6),
    uniqueCodePrefix: z.string().default(""),
    uniqueCodePadding: z.coerce.number().int().min(3).max(10).default(6),
    defaultStockAlert: z.coerce.number().int().min(0).default(100),
    timezone: z.string().default("Europe/Paris"),
    language: z.string().default("fr"),
  }),
});

export async function POST(req: NextRequest) {
  await ensureWal();

  const existing = await prisma.appConfig.findUnique({ where: { id: 1 } });
  if (existing?.initialized) {
    return NextResponse.json({ error: "already_initialized" }, { status: 409 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }
  const { admin, company, settings } = parsed.data;
  const passwordHash = await hashPassword(admin.password);
  const jwtSecret = crypto.randomBytes(48).toString("base64");

  const adminUser = await prisma.$transaction(async (tx) => {
    // 1. AppConfig
    await tx.appConfig.upsert({
      where: { id: 1 },
      update: {
        initialized: true,
        jwtSecret,
        articleCodePrefix: settings.articleCodePrefix,
        articleCodePadding: settings.articleCodePadding,
        uniqueCodePrefix: settings.uniqueCodePrefix,
        uniqueCodePadding: settings.uniqueCodePadding,
        defaultStockAlert: settings.defaultStockAlert,
        timezone: settings.timezone,
        language: settings.language,
      },
      create: {
        id: 1,
        initialized: true,
        jwtSecret,
        articleCodePrefix: settings.articleCodePrefix,
        articleCodePadding: settings.articleCodePadding,
        uniqueCodePrefix: settings.uniqueCodePrefix,
        uniqueCodePadding: settings.uniqueCodePadding,
        defaultStockAlert: settings.defaultStockAlert,
        timezone: settings.timezone,
        language: settings.language,
      },
    });

    // 2. Company
    await tx.company.create({
      data: {
        name: company.name,
        siret: company.siret || null,
        vatNumber: company.vatNumber || null,
        address: company.address || null,
        postalCode: company.postalCode || null,
        city: company.city || null,
        country: company.country,
        phone: company.phone || null,
        email: company.email || null,
        currency: company.currency,
        fiscalYearStart: new Date(company.fiscalYearStart),
        fiscalYearEnd: new Date(company.fiscalYearEnd),
      },
    });

    // 3. Permissions (seed)
    for (const [key, def] of Object.entries(PERMISSIONS)) {
      await tx.permission.upsert({
        where: { key },
        update: { module: def.module, description: def.description },
        create: { key, module: def.module, description: def.description },
      });
    }

    // 4. Roles ADMIN + USER
    const adminRole = await tx.role.create({
      data: {
        code: "ADMIN",
        name: "Administrateur",
        description: "Acces complet a l'ERP",
        isSystem: true,
      },
    });
    const userRole = await tx.role.create({
      data: {
        code: "USER",
        name: "Utilisateur",
        description: "Acces en lecture aux modules principaux",
        isSystem: true,
      },
    });

    // 5. Associer toutes les permissions a ADMIN
    const allPerms = await tx.permission.findMany();
    for (const p of allPerms) {
      await tx.rolePermission.create({ data: { roleId: adminRole.id, permissionId: p.id } });
    }
    // USER : permissions de lecture par defaut
    for (const k of DEFAULT_USER_PERMISSIONS) {
      const p = allPerms.find((x) => x.key === k);
      if (p) await tx.rolePermission.create({ data: { roleId: userRole.id, permissionId: p.id } });
    }

    // 6. Utilisateur Admin
    const user = await tx.user.create({
      data: {
        email: admin.email.toLowerCase(),
        name: admin.name,
        passwordHash,
      },
    });
    await tx.userRole.create({ data: { userId: user.id, roleId: adminRole.id } });

    // 7. Plan comptable
    const createdAccounts = new Map<string, string>();
    for (const acc of PCG_FR) {
      const created = await tx.account.create({
        data: {
          number: acc.number,
          label: acc.label,
          type: acc.type,
          parentId: acc.parent ? createdAccounts.get(acc.parent) ?? null : null,
        },
      });
      createdAccounts.set(acc.number, created.id);
    }

    // 8. Journaux
    for (const j of STANDARD_JOURNALS) {
      await tx.journal.create({ data: { code: j.code, name: j.name } });
    }

    // 9. Exercice fiscal
    await tx.fiscalYear.create({
      data: {
        label: `Exercice ${new Date(company.fiscalYearStart).getFullYear()}`,
        startDate: new Date(company.fiscalYearStart),
        endDate: new Date(company.fiscalYearEnd),
      },
    });

    // 10. Taux TVA standards
    const vatRates = [
      { code: "TVA20", name: "TVA 20%", rate: 20, isDefault: true },
      { code: "TVA10", name: "TVA 10%", rate: 10 },
      { code: "TVA55", name: "TVA 5,5%", rate: 5.5 },
      { code: "TVA21", name: "TVA 2,1%", rate: 2.1 },
      { code: "TVA0", name: "TVA 0% / Exoneree", rate: 0 },
    ];
    for (const v of vatRates) {
      await tx.vatRate.create({ data: v });
    }

    // 11. Unites par defaut
    const units = [
      { code: "pcs", name: "Piece", isBase: true },
      { code: "m", name: "Metre" },
      { code: "kg", name: "Kilogramme" },
      { code: "l", name: "Litre" },
    ];
    for (const u of units) {
      await tx.unit.create({ data: u });
    }

    return user;
  });

  invalidateSecretCache();
  await audit({
    userId: adminUser.id,
    action: "SETUP_COMPLETED",
    entity: "AppConfig",
    entityId: "1",
    ip: req.headers.get("x-forwarded-for"),
    userAgent: req.headers.get("user-agent"),
  });

  await createSession(adminUser.id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set("app_initialized", "1", { path: "/", maxAge: 60 * 60 * 24 * 365 });
  return res;
}
