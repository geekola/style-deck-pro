import { NextResponse } from "next/server";

/**
 * POST /api/invites/[token]/accept
 *
 * Deprecated: superseded by the email-verification invite flow
 * (see /api/auth/complete-invite and lib/complete-invite.ts). This route
 * predates `requireEmailVerification: true` and called a better-auth admin
 * API (`createUser`) that isn't enabled in this project's auth config.
 * Kept as a stub so old clients get a clear error instead of a 500.
 */
export async function POST() {
  return NextResponse.json(
    { error: "This endpoint is deprecated. Use the invite link flow instead." },
    { status: 410 }
  );
}
