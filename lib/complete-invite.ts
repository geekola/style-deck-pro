import { db } from "@/lib/db";
import { invites, customers, brandAccess, customerTypeEnum, industryEnum } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { audit, AuditAction } from "@/lib/audit";
import type { Session } from "@/lib/auth";

export const CUSTOMER_TYPE_VALUES = customerTypeEnum.enumValues;
export const INDUSTRY_VALUES = industryEnum.enumValues;

type CustomerType = (typeof CUSTOMER_TYPE_VALUES)[number];
type Industry = (typeof INDUSTRY_VALUES)[number];

type CompleteInviteParams = {
  session: Session;
  token: string;
  type: CustomerType;
  industry: Industry;
  ip?: string;
};

type CompleteInviteResult = { ok: true } | { error: string; status: number };

/**
 * Finishes an invite-based signup: creates the customer record, marks the
 * invite accepted, and grants brand access if applicable.
 *
 * Requires an authenticated session. With `requireEmailVerification: true`,
 * better-auth doesn't create a session at sign-up time, so this is called
 * once a session exists — either immediately (if email verification isn't
 * required) or after the user verifies their email and is auto-signed-in
 * (via /api/auth/finalize).
 */
export async function completeInvite({
  session,
  token,
  type,
  industry,
  ip,
}: CompleteInviteParams): Promise<CompleteInviteResult> {
  const [invite] = await db.select().from(invites).where(eq(invites.token, token)).limit(1);

  if (!invite || invite.status !== "pending" || invite.expiresAt < new Date()) {
    return { error: "Invite is no longer valid", status: 410 };
  }

  if (invite.email.toLowerCase() !== session.user.email.toLowerCase()) {
    return { error: "This invite is for a different email address", status: 403 };
  }

  // If the customer record already exists (e.g. the user revisited the
  // verification link, or this ran once already), there's nothing left to do.
  const [existingCustomer] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.userId, session.user.id))
    .limit(1);

  if (existingCustomer) {
    return { ok: true };
  }

  const [customer] = await db
    .insert(customers)
    .values({ userId: session.user.id, type, industry })
    .returning({ id: customers.id });

  await db.update(invites).set({ status: "accepted" }).where(eq(invites.id, invite.id));

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
    ip,
  });

  return { ok: true };
}
