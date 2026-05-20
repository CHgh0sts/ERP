import { NextRequest, NextResponse } from "next/server";

const INIT_COOKIE = "app_initialized";
const INIT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

// Routes publiques (pas d'auth requise)
const PUBLIC_PATHS = [
  "/login",
  "/setup",
  "/403",
  "/forgot-password",
  "/api/auth/login",
  "/api/setup",
];

function isPublic(pathname: string): boolean {
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/favicon")) return true;
  if (pathname.startsWith("/api/setup")) return true;
  if (pathname.startsWith("/api/auth/login")) return true;
  if (pathname.startsWith("/api/auth/logout")) return true;
  if (pathname.startsWith("/api/auth/forgot-password")) return true;
  if (pathname.startsWith("/api/auth/reset-password")) return true;
  if (pathname.startsWith("/reset-password/")) return true;
  return PUBLIC_PATHS.includes(pathname);
}

function withInitCookie(res: NextResponse): NextResponse {
  res.cookies.set(INIT_COOKIE, "1", { path: "/", maxAge: INIT_COOKIE_MAX_AGE, sameSite: "lax" });
  return res;
}

function requestOrigin(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? req.nextUrl.protocol.replace(":", "");
  const host =
    req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    req.headers.get("host") ??
    req.nextUrl.host;
  return `${proto}://${host}`;
}

async function checkInitialized(req: NextRequest): Promise<boolean> {
  if (req.cookies.get(INIT_COOKIE)?.value === "1") return true;

  try {
    const origin = requestOrigin(req);
    const r = await fetch(`${origin}/api/setup/status`, {
      cache: "no-store",
      headers: { "x-setup-check": "1" },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return false;
    const data = (await r.json()) as { initialized?: boolean };
    return !!data.initialized;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/_next") || pathname.includes(".")) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/api/setup")) {
    return NextResponse.next();
  }

  const initialized = await checkInitialized(req);

  if (!initialized) {
    if (pathname.startsWith("/setup") || pathname.startsWith("/api/setup")) {
      return NextResponse.next();
    }
    const url = req.nextUrl.clone();
    url.pathname = "/setup";
    return NextResponse.redirect(url);
  }

  // Deja initialise : ne plus afficher /setup
  if (pathname.startsWith("/setup")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return withInitCookie(NextResponse.redirect(url));
  }

  const res = NextResponse.next();
  if (req.cookies.get(INIT_COOKIE)?.value !== "1") {
    withInitCookie(res);
  }

  if (isPublic(pathname)) return res;

  const session = req.cookies.get("erp_session")?.value;
  if (!session) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
