import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";

const ROLE_DESTINATIONS: Record<string, string> = {
  platform_admin: "/admin",
  brand_admin: "/brand/dashboard",
  customer: "/app/discover",
};

/**
 * GET /api/auth/finalize
 * Called after login (as callbackURL). Reads the session, sets the sd_role cookie
 * so the edge middleware can do fast role checks, then redirects to the right dashboard.
 */
export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.redirect(new URL("/login", process.env.BETTER_AUTH_URL!));
  }

  const role = session.user.role as string;
  const destination = ROLE_DESTINATIONS[role] ?? "/login";

  const response = NextResponse.redirect(
    new URL(destination, process.env.BETTER_AUTH_URL!)
  );

  // Set sd_role cookie — httpOnly: false so edge middleware can read it
  response.cookies.set("sd_role", role, {
    httpOnly: false,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30, // 30 days (session expiry governs actual auth)
  });

  return response;
}
