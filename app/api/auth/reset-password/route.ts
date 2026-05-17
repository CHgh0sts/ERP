import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { consumeResetToken, findValidToken } from "@/lib/auth/reset-token";
import { parseOrThrow } from "@/lib/zod-fr";
import { audit } from "@/lib/audit";

const schema = z.object({
  token: z.string().min(10),
  password: z.string().min(8, "Minimum 8 caracteres"),
  password2: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

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

  if (data.password !== data.password2) {
    return NextResponse.json(
      { error: "Les mots de passe ne correspondent pas" },
      { status: 400 },
    );
  }

  try {
    const { userId } = await consumeResetToken(data.token, data.password);
    await audit({
      userId,
      action: "PASSWORD_RESET",
      entity: "User",
      entityId: userId,
      ip,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

// Endpoint pour valider le token cote client (page reset) sans consommer
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  const rec = await findValidToken(token);
  if (!rec) {
    return NextResponse.json({ valid: false });
  }
  return NextResponse.json({
    valid: true,
    email: rec.user.email,
    expiresAt: rec.expiresAt.toISOString(),
  });
}
