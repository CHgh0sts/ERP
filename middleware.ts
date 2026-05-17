import { NextRequest, NextResponse } from "next/server";

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

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Requetes d'assets / API setup / API auth - laisser passer sans check d'init
  if (pathname.startsWith("/_next") || pathname.includes(".")) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/api/setup")) {
    return NextResponse.next();
  }

  // Verifier si l'app est initialisee via endpoint leger
  // Pour eviter un hit API par requete on se base sur un cookie "app_initialized"
  // pose apres setup. Si absent, on fait un fetch vers /api/setup/status.
  const initCookie = req.cookies.get("app_initialized")?.value;
  let initialized = initCookie === "1";

  if (!initialized) {
    try {
      const url = new URL("/api/setup/status", req.url);
      const r = await fetch(url.toString(), { cache: "no-store" });
      if (r.ok) {
        const data = (await r.json()) as { initialized: boolean };
        initialized = !!data.initialized;
      }
    } catch {
      initialized = false;
    }
  }

  if (!initialized) {
    if (pathname.startsWith("/setup") || pathname.startsWith("/api/setup")) {
      return NextResponse.next();
    }
    const url = req.nextUrl.clone();
    url.pathname = "/setup";
    return NextResponse.redirect(url);
  }

  // App initialisee : /setup redirige vers dashboard
  if (pathname.startsWith("/setup")) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    const res = NextResponse.redirect(url);
    res.cookies.set("app_initialized", "1", { path: "/", maxAge: 60 * 60 * 24 * 365 });
    return res;
  }

  // Memoize le flag
  const res = NextResponse.next();
  if (!initCookie) {
    res.cookies.set("app_initialized", "1", { path: "/", maxAge: 60 * 60 * 24 * 365 });
  }

  if (isPublic(pathname)) return res;

  // Verifier le cookie de session
  const session = req.cookies.get("erp_session")?.value;
  if (!session) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: [
    // exclure statics et fichiers
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
