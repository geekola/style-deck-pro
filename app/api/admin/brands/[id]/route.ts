import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/auth-session";
import { db } from "@/lib/db";
import {
  brands,
  users,
  brandAdmins,
  orders,
  auditLogs,
  brandCategoryEnum,
  accessPolicyEnum,
} from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";
import { audit, AuditAction } from "@/lib/audit";
import { sendBrandStatusEmail } from "@/lib/email";
import { createCredentialUser, generateTempPassword } from "@/lib/auth-provision";

const schema = z.object({
  status: z.enum(["approved", "rejected", "suspended"]),
  reason: z.string().trim().max(1000).optional(),
});

const patchSchema = z.object({
  name: z.string().trim().min(1).max(200),
  category: z.enum(brandCategoryEnum.enumValues),
  adminEmail: z.string().trim().toLowerCase().email(),
  fulfillmentEmail: z.string().trim().toLowerCase().email(),
  accessPolicy: z.enum(accessPolicyEnum.enumValues),
});

// Allowed status transitions, keyed by target status -> allowed current statuses.
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  approved: ["pending", "rejected", "suspended"],
  rejected: ["pending"],
  suspended: ["approved"],
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requirePlatformAdmin();
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const [brand] = await db
    .select()
    .from(brands)
    .where(eq(brands.id, id))
    .limit(1);

  if (!brand) {
    return NextResponse.json({ error: "Brand not found" }, { status: 404 });
  }

  const { status, reason } = parsed.data;

  if (!ALLOWED_TRANSITIONS[status]?.includes(brand.status)) {
    return NextResponse.json(
      { error: `Cannot move a ${brand.status} brand to ${status}` },
      { status: 409 }
    );
  }

  const wasReactivation = status === "approved" && brand.status === "suspended";

  // If approving, resolve the brand_admin user account for the admin email
  // *before* mutating anything, so we can reject cleanly without leaving the
  // brand in a half-updated state.
  let existingUser: { id: string; role?: string } | undefined;
  if (status === "approved") {
    [existingUser] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.email, brand.adminEmail))
      .limit(1);

    // Guard against clobbering a platform admin's (or another brand admin's)
    // role: if this email already belongs to a platform admin, elevating them
    // to brand_admin would silently lock them out of the admin console.
    if (existingUser && existingUser.role === "platform_admin") {
      return NextResponse.json(
        {
          error:
            "This brand's admin email belongs to a platform admin account. " +
            "Use a different admin email for the brand before approving.",
        },
        { status: 409 }
      );
    }
  }

  await db
    .update(brands)
    .set({
      status,
      // Clear any prior reason once a brand is (re)approved; otherwise store
      // the reason given for this rejection/suspension.
      statusReason: status === "approved" ? null : reason ?? null,
      updatedAt: new Date(),
    })
    .where(eq(brands.id, id));

  // If approving, create a brand_admin user account for the admin email
  let tempPassword: string | undefined;
  if (status === "approved") {
    if (!existingUser) {
      // Create the user account with a temp password the platform admin can
      // relay to the brand. There's no email verification or password reset
      // flow yet, so emailVerified must be true for them to be able to log in.
      tempPassword = generateTempPassword();
      const newUser = await createCredentialUser({
        email: brand.adminEmail,
        name: brand.name,
        role: "brand_admin",
        password: tempPassword,
        emailVerified: true,
      });
      existingUser = { id: newUser.id };
    } else {
      // Elevate existing user to brand_admin
      await db
        .update(users)
        .set({ role: "brand_admin" })
        .where(eq(users.id, existingUser.id));
    }

    // Create brand_admin link
    await db
      .insert(brandAdmins)
      .values({ userId: existingUser.id, brandId: id })
      .onConflictDoNothing();
  }

  let auditAction: string;
  if (status === "approved") {
    auditAction = wasReactivation ? AuditAction.BRAND_REACTIVATED : AuditAction.BRAND_APPROVED;
  } else if (status === "suspended") {
    auditAction = AuditAction.BRAND_SUSPENDED;
  } else {
    auditAction = AuditAction.BRAND_REJECTED;
  }

  await audit({
    actorId: session.user.id,
    action: auditAction,
    entityType: "brand",
    entityId: id,
    metadata: reason ? { reason } : undefined,
    ip: request.headers.get("x-forwarded-for") ?? undefined,
  });

  // Send email notification (non-blocking)
  sendBrandStatusEmail({
    to: brand.adminEmail,
    brandName: brand.name,
    status,
    reason,
    reactivated: wasReactivation,
  }).catch(console.error);

  return NextResponse.json({
    id,
    status,
    statusReason: status === "approved" ? null : reason ?? null,
    tempPassword,
  });
}

/**
 * Edit a brand's details (name, category, contact emails, access policy).
 * Does not affect existing brand_admin user accounts -- those are managed
 * via /api/admin/brands/[id]/admins.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requirePlatformAdmin();
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const [brand] = await db.select().from(brands).where(eq(brands.id, id)).limit(1);
  if (!brand) {
    return NextResponse.json({ error: "Brand not found" }, { status: 404 });
  }

  const { name, category, adminEmail, fulfillmentEmail, accessPolicy } = parsed.data;

  await db
    .update(brands)
    .set({ name, category, adminEmail, fulfillmentEmail, accessPolicy, updatedAt: new Date() })
    .where(eq(brands.id, id));

  await audit({
    actorId: session.user.id,
    action: AuditAction.BRAND_UPDATED,
    entityType: "brand",
    entityId: id,
    metadata: {
      before: {
        name: brand.name,
        category: brand.category,
        adminEmail: brand.adminEmail,
        fulfillmentEmail: brand.fulfillmentEmail,
        accessPolicy: brand.accessPolicy,
      },
      after: parsed.data,
    },
    ip: request.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ id, ...parsed.data });
}

/**
 * Permanently delete a brand. Refuses if the brand has order history --
 * suspend it instead to revoke access while preserving records.
 *
 * Products, product images, brand_admins links, brand_access, gifting
 * allowances, and invites cascade automatically via FK constraints. Any
 * brand_admin user account that exists solely for this brand (no other
 * brand_admins rows after the cascade) is removed too.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requirePlatformAdmin();
  const { id } = await params;

  const [brand] = await db.select().from(brands).where(eq(brands.id, id)).limit(1);
  if (!brand) {
    return NextResponse.json({ error: "Brand not found" }, { status: 404 });
  }

  const [{ count: orderCount }] = await db
    .select({ count: count() })
    .from(orders)
    .where(eq(orders.brandId, id));

  if (orderCount > 0) {
    return NextResponse.json(
      {
        error: `This brand has ${orderCount} order(s) and can't be deleted. Suspend it instead to revoke access while preserving order history.`,
      },
      { status: 409 }
    );
  }

  // Capture brand_admin links before the cascade removes them.
  const linkedAdmins = await db
    .select({ id: users.id, role: users.role })
    .from(brandAdmins)
    .innerJoin(users, eq(users.id, brandAdmins.userId))
    .where(eq(brandAdmins.brandId, id));

  await db.delete(brands).where(eq(brands.id, id));

  // Remove brand_admin accounts that existed solely for this brand.
  for (const admin of linkedAdmins) {
    if (admin.role !== "brand_admin") continue;

    const [remaining] = await db
      .select({ id: brandAdmins.id })
      .from(brandAdmins)
      .where(eq(brandAdmins.userId, admin.id))
      .limit(1);

    if (remaining) continue;

    // audit_logs.actor_id has no cascade -- clear it before deleting the user.
    await db.delete(auditLogs).where(eq(auditLogs.actorId, admin.id));
    await db.delete(users).where(eq(users.id, admin.id));
  }

  await audit({
    actorId: session.user.id,
    action: AuditAction.BRAND_DELETED,
    entityType: "brand",
    entityId: id,
    metadata: { name: brand.name, adminEmail: brand.adminEmail },
    ip: request.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ id, deleted: true });
}
