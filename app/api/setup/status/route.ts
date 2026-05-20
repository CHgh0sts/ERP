import { NextResponse } from "next/server";
import { isAppInitialized } from "@/lib/setup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const initialized = await isAppInitialized();
  const res = NextResponse.json({ initialized });
  if (initialized) {
    res.cookies.set("app_initialized", "1", {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }
  return res;
}
