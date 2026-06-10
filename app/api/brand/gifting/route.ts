import { NextResponse } from "next/server";
import { requireBrandAdmin } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { giftingAllowances, customers, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/brand/gifting
 * Returns gifting allowances for all customers of this brand.
 * Never exposed to customers — brand-only endpoint.
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
