import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invites } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/invites/[token]
 * Validates an invite token — used by the registration page to confirm the invite is valid.
 * Public endpoint (no auth required).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const [invite] = await db
    .select({
      id: invites.id,
      email: invites.email,
      source: invites.source,
      brandId: invites.brandId,
      status: invites.status,
      expiresAt: invites.expiresAt,
    })
    .from(invites)
    .where(eq(invites.token, token))
    .limit(1);

  if (!invite) {
    return NextResponse.json({ error: "Invalid invite" }, { status: 404 });
  }

  if (invite.status !== "pending") {
    return NextResponse.json({ error: "Invite already used" }, { status: 410 });
  }

  if (invite.expiresAt < new Date()) {
    await db
      .update(invites)
      .set({ status: "expired" })
      .where(eq(invites.id, invite.id));
    return NextResponse.json({ error: "Invite expired" }, { status: 410 });
  }

  return NextResponse.json({ email: invite.email, valid: true });
}
