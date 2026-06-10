import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { invites, customers, brandAccess, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { audit, AuditAction } from "@/lib/audit";

const schema = z.object({
  name: z.string().min(1).max(200),
  password: z.string().min(8),
  type: z.enum(["celebrity", "athlete", "influencer", "executive", "creator", "other"]),
  industry: z.enum(["film", "music", "sports", "fashion", "business", "media", "technology", "other"]),
});

/**
 * POST /api/invites/[token]/accept
 * Completes registration from an invite link.
 * Public — no auth required.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Validate invite
  const [invite] = await db
    .select()
    .from(invites)
    .where(and(eq(invites.token, token), eq(invites.status, "pending")))
    .limit(1);

  if (!invite) {
    return NextResponse.json({ error: "Invalid or expired invite" }, { status: 410 });
  }

  if (invite.expiresAt < new Date()) {
    await db.update(invites).set({ status: "expired" }).where(eq(invites.id, invite.id));
    return NextResponse.json({ error: "Invite expired" }, { status: 410 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Check if email already registered
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, invite.email))
    .limit(1);

  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 }
    );
  }

  // Create user via Better Auth
  const newUser = await auth.api.createUser({
    body: {
      email: invite.email,
      name: parsed.data.name,
      password: parsed.data.password,
      role: "customer",
      emailVerified: true, // invite = verified intent
    },
  });

  // Create customer record
  const [customer] = await db
    .insert(customers)
    .values({
      userId: newUser.user.id,
      type: parsed.data.type,
      industry: parsed.data.industry,
    })
    .returning({ id: customers.id });

  // If this was a brand invite, grant access immediately
  if (invite.brandId) {
    await db
      .insert(brandAccess)
      .values({ brandId: invite.brandId, customerId: customer.id })
      .onConflictDoNothing();
  }

  // Mark invite accepted
  await db
    .update(invites)
    .set({ status: "accepted" })
    .where(eq(invites.id, invite.id));

  await audit({
    actorId: newUser.user.id,
    action: AuditAction.INVITE_ACCEPTED,
    entityType: "invite",
    entityId: invite.id,
    metadata: { email: invite.email, brandId: invite.brandId },
    ip: request.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ registered: true }, { status: 201 });
}
