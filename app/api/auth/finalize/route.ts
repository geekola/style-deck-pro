import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import { completeInvite, CUSTOMER_TYPE_VALUES, INDUSTRY_VALUES } from "@/lib/complete-invite";

const ROLE_DESTINATIONS: Record<string, string> = {
  platform_admin: "/admin",
  brand_admin: "/brand",
  customer: "/app/discover",
};

/**
 * GET /api/auth/finalize
 * Called after login (as callbackURL). Reads the session, sets the sd_role cookie
 * so the edge middleware can do fast role checks, then redirects to the right dashboard.
 *
 * Also doubles as the post-email-verification landing page for invite signups:
 * when requireEmailVerification is enabled, better-auth doesn't create a
 * session at sign-up time, so the invite page can't call /api/auth/complete-invite
 * directly. Instead it passes inviteToken/type/industry through as the
 * verification callbackURL; once the user verifies their email and is
 * auto-signed-in, we land here with a session and finish the invite.
 */
export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.redirect(new URL("/login", process.env.BETTER_AUTH_URL!));
  }

  const { searchParams } = new URL(request.url);
  const inviteToken = searchParams.get("inviteToken");
  const type = searchParams.get("type");
  const industry = searchParams.get("industry");

  if (
    inviteToken &&
    (CUSTOMER_TYPE_VALUES as readonly string[]).includes(type ?? "") &&
    (INDUSTRY_VALUES as readonly string[]).includes(industry ?? "")
  ) {
    const result = await completeInvite({
      session,
      token: inviteToken,
      type: type as (typeof CUSTOMER_TYPE_VALUES)[number],
      industry: industry as (typeof INDUSTRY_VALUES)[number],
      ip: request.headers.get("x-forwarded-for") ?? undefined,
    });

    if ("error" in result) {
      const url = new URL("/login", process.env.BETTER_AUTH_URL!);
      url.searchParams.set("inviteError", result.error);
      return NextResponse.redirect(url);
    }
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
