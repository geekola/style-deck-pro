import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { users, customers, customerTypeEnum, industryEnum, orders, auditLogs } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";
import { audit, AuditAction } from "@/lib/audit";

const schema = z
  .object({
    customerStatus: z.enum(["active", "suspended"]).optional(),
    name: z.string().trim().min(1).max(200).optional(),
    email: z.string().trim().toLowerCase().email().optional(),
    customerType: z.enum(customerTypeEnum.enumValues).optional(),
    customerIndustry: z.enum(industryEnum.enumValues).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "No fields to update" });

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

  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { customerStatus, name, email, customerType, customerIndustry } = parsed.data;

  // Suspend/reactivate (affects discovery feed access)
  if (customerStatus) {
    await db.update(customers).set({ status: customerStatus }).where(eq(customers.userId, id));

    await audit({
      actorId: session.user.id,
      action:
        customerStatus === "suspended" ? AuditAction.USER_SUSPENDED : AuditAction.USER_ACTIVATED,
      entityType: "user",
      entityId: id,
      ip: request.headers.get("x-forwarded-for") ?? undefined,
    });
  }

  // Profile edits
  if (name || email || customerType || customerIndustry) {
    if (email && email !== user.email) {
      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      if (existing && existing.id !== id) {
        return NextResponse.json({ error: "Email already in use" }, { status: 409 });
      }
    }

    if (name || email) {
      await db
        .update(users)
        .set({ ...(name ? { name } : {}), ...(email ? { email } : {}), updatedAt: new Date() })
        .where(eq(users.id, id));
    }

    if (customerType || customerIndustry) {
      await db
        .update(customers)
        .set({
          ...(customerType ? { type: customerType } : {}),
          ...(customerIndustry ? { industry: customerIndustry } : {}),
        })
        .where(eq(customers.userId, id));
    }

    await audit({
      actorId: session.user.id,
      action: AuditAction.USER_UPDATED,
      entityType: "user",
      entityId: id,
      metadata: {
        before: { name: user.name, email: user.email },
        after: { name, email, customerType, customerIndustry },
      },
      ip: request.headers.get("x-forwarded-for") ?? undefined,
    });
  }

  return NextResponse.json({ id, ...parsed.data });
}

/**
 * Permanently delete a customer account. Refuses if the customer has order
 * history -- suspend the account instead to preserve records.
 *
 * Deleting the user row cascades to the customer profile (measurements,
 * saved products, swipe history, sessions, accounts).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requirePlatformAdmin();
  const { id } = await params;

  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (user.role !== "customer") {
    return NextResponse.json(
      { error: "Only customer accounts can be deleted here" },
      { status: 400 }
    );
  }

  const [customer] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.userId, id))
    .limit(1);

  if (customer) {
    const [{ count: orderCount }] = await db
      .select({ count: count() })
      .from(orders)
      .where(eq(orders.customerId, customer.id));

    if (orderCount > 0) {
      return NextResponse.json(
        {
          error: `This customer has ${orderCount} order(s) and can't be deleted. Suspend the account instead to preserve order history.`,
        },
        { status: 409 }
      );
    }
  }

  // audit_logs.actor_id has no cascade -- clear it before deleting the user.
  await db.delete(auditLogs).where(eq(auditLogs.actorId, id));
  await db.delete(users).where(eq(users.id, id));

  await audit({
    actorId: session.user.id,
    action: AuditAction.USER_DELETED,
    entityType: "user",
    entityId: id,
    metadata: { name: user.name, email: user.email },
    ip: request.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ id, deleted: true });
}
