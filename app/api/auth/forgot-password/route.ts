import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createResetToken, buildResetUrl } from "@/lib/auth/reset-token";
import { parseOrThrow } from "@/lib/zod-fr";
import { audit } from "@/lib/audit";

const schema = z.object({
  email: z.string().min(1).email(),
});

// Rate-limit tres simple en memoire (par IP)
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX = 8;
const WINDOW_MS = 10 * 60 * 1000;

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const r = attempts.get(ip);
  if (!r || r.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  r.count++;
  if (r.count > MAX) return false;
  return true;
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  if (!rateLimit(ip)) {
    return NextResponse.json(
      { error: "Trop de tentatives, reessayez plus tard" },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requete invalide" }, { status: 400 });
  }

  let data: z.infer<typeof schema>;
  try {
    data = parseOrThrow(schema, body);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  const email = data.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  // Reponse identique pour eviter l'enumeration
  const genericOk = {
    ok: true,
    message:
      "Si un compte existe avec cet email, une demande de reinitialisation a ete enregistree. Contactez votre administrateur pour recuperer le lien.",
  };

  if (!user || !user.isActive) {
    return NextResponse.json(genericOk);
  }

  const { token, expiresAt } = await createResetToken({ userId: user.id, requestedIp: ip });

  // Pas de SMTP configure sur l'ERP local : on loggue le lien dans la console serveur
  // pour que l'administrateur puisse le recuperer et le transmettre a l'utilisateur.
  const origin =
    req.headers.get("x-forwarded-proto") && req.headers.get("x-forwarded-host")
      ? `${req.headers.get("x-forwarded-proto")}://${req.headers.get("x-forwarded-host")}`
      : req.nextUrl.origin;
  const resetUrl = buildResetUrl(origin, token);
  // eslint-disable-next-line no-console
  console.info(
    `\n=== [Password reset] ===\nUser : ${user.email}\nLien : ${resetUrl}\nExpire : ${expiresAt.toISOString()}\n========================\n`,
  );

  await audit({
    userId: user.id,
    action: "PASSWORD_RESET_REQUEST",
    entity: "User",
    entityId: user.id,
    diff: { ip, self: true },
    ip,
  });

  return NextResponse.json(genericOk);
}
