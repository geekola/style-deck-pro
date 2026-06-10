import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { invites, customers, brandAccess } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth-session";
import { audit, AuditAction } from "@/lib/audit";

const schema = z.object({
  token: z.string().min(1),
  type: z.enum(["celebrity", "athlete", "influencer", "executive", "creator", "other"]),
  industry: z.enum(["film", "music", "sports", "fashion", "business", "media", "technology", "other"]),
});

/**
 * POST /api/auth/complete-invite
 * Called after a customer signs up via an invite link.
 * Creates their customer record, marks the invite accepted, and grants brand_access if applicable.
 */
export async function POST(request: NextRequest) {
  const session = await requireSession();

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { token, type, industry } = parsed.data;

  // Validate invite
  const [invite] = await db
    .select()
    .from(invites)
    .where(eq(invites.token, token))
    .limit(1);

  if (!invite || invite.status !== "pending" || invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invite is no longer valid" }, { status: 410 });
  }

  if (invite.email.toLowerCase() !== session.user.email.toLowerCase()) {
    return NextResponse.json({ error: "This invite is for a different email address" }, { status: 403 });
  }

  // Create customer record
  const [customer] = await db
    .insert(customers)
    .values({
      userId: session.user.id,
      type,
      industry,
    })
    .returning({ id: customers.id });

  // Mark invite accepted
  await db
    .update(invites)
    .set({ status: "accepted" })
    .where(eq(invites.id, invite.id));

  // Grant brand access if this was a brand invite
  if (invite.brandId) {
    await db
      .insert(brandAccess)
      .values({ brandId: invite.brandId, customerId: customer.id })
      .onConflictDoNothing();
  }

  await audit({
    actorId: session.user.id,
    action: AuditAction.INVITE_ACCEPTED,
    entityType: "invite",
    entityId: invite.id,
    metadata: { accepted: true, customerId: customer.id },
    ip: request.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ ok: true });
}
