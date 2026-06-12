import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireBrandAdmin } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { giftingAllowances, customers, users, brandAccess } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { audit, AuditAction } from "@/lib/audit";

/**
 * GET /api/brand/gifting
 * Returns gifting allowances for all customers of this brand.
 * Never exposed to customers -- brand-only endpoint.
 */
export async function GET() {
  const { brandId } = await requireBrandAdmin();

  const rows = await db
    .select({
      id: giftingAllowances.id,
      customerId: giftingAllowances.customerId,
      customerName: users.name,
      periodType: giftingAllowances.periodType,
      amountCents: giftingAllowances.amountCents,
      usedCents: giftingAllowances.usedCents,
      periodStart: giftingAllowances.periodStart,
      manualResetAt: giftingAllowances.manualResetAt,
    })
    .from(giftingAllowances)
    .innerJoin(customers, eq(giftingAllowances.customerId, customers.id))
    .innerJoin(users, eq(customers.userId, users.id))
    .where(eq(giftingAllowances.brandId, brandId));

  return NextResponse.json(rows);
}

const createSchema = z.object({
  customerId: z.string().uuid(),
  amountCents: z.number().int().positive(),
  periodType: z.enum(["rolling", "calendar"]),
  periodStart: z.string().datetime().optional(),
});

/**
 * POST /api/brand/gifting
 * Creates a gifting allowance for a customer of this brand.
 * Customer must have access to the brand (or the brand must be open).
 */
export async function POST(request: NextRequest) {
  const { session, brandId } = await requireBrandAdmin();

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { customerId, amountCents, periodType } = parsed.data;
  const periodStart = parsed.data.periodStart ? new Date(parsed.data.periodStart) : new Date();

  // Verify the customer exists and is active
  const [customer] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.status, "active")))
    .limit(1);

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const [row] = await db
    .insert(giftingAllowances)
    .values({ brandId, customerId, amountCents, periodType, periodStart })
    .onConflictDoNothing()
    .returning({ id: giftingAllowances.id });

  if (!row) {
    return NextResponse.json(
      { error: "An allowance already exists for this customer" },
      { status: 409 }
    );
  }

  // Selective/invite-only brands: granting an allowance also grants access
  await db
    .insert(brandAccess)
    .values({ brandId, customerId })
    .onConflictDoNothing();

  await audit({
    actorId: session.user.id,
    action: AuditAction.GIFTING_ALLOWANCE_SET,
    entityType: "gifting_allowance",
    entityId: row.id,
    metadata: { customerId, amountCents, periodType },
    ip: request.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ id: row.id }, { status: 201 });
}
