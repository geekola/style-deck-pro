import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Routes that require no auth
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/invite",           // /invite/[token] — registration via invite
  "/brand/register",   // brand registration form
  "/api/auth",         // Better Auth handlers
  "/api/invites",      // GET /api/invites/[token] — validate invite token
  "/api/webhooks",     // Stripe webhooks (have their own signature validation)
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p + "?")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  // Read session cookie — better-auth sets this as a signed cookie
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based route protection
  // Full session/role validation happens again in each API route — this is a
  // fast edge check to redirect unauthenticated users and catch obvious role mismatches.
  // The actual role is stored in the session JWT / cookie payload via Better Auth.
  const role = request.cookies.get("sd_role")?.value;

  if (pathname.startsWith("/admin") && role !== "platform_admin") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname.startsWith("/brand") && role !== "brand_admin" && role !== "platform_admin") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (
    pathname.startsWith("/app") &&
    role !== "customer" &&
    role !== "platform_admin"
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
