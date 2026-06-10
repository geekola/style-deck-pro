import { NextResponse } from "next/server";
import { requireBrandAdmin } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { customers, users, brandAccess, brands } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * GET /api/brand/customers
 *
 * Returns all customers visible to this brand based on access policy:
 * - open: all active customers
 * - selective / invite_only: only customers with an explicit brand_access row
 *
 * Never returns costPrice or gifting budget data.
 */
export async function GET() {
  const { brandId } = await requireBrandAdmin();

  const [brand] = await db
    .select({ accessPolicy: brands.accessPolicy })
    .from(brands)
    .where(eq(brands.id, brandId))
    .limit(1);

  if (!brand) return NextResponse.json({ error: "Brand not found" }, { status: 404 });

  if (brand.accessPolicy === "open") {
    // All active customers
    const rows = await db
      .select({
        id: customers.id,
        name: users.name,
        email: users.email,
        type: customers.type,
        industry: customers.industry,
        status: customers.status,
        hasAccess: brandAccess.id,
      })
      .from(customers)
      .innerJoin(users, eq(customers.userId, users.id))
      .leftJoin(
        brandAccess,
        and(eq(brandAccess.customerId, customers.id), eq(brandAccess.brandId, brandId))
      )
      .where(eq(customers.status, "active"));

    return NextResponse.json(
      rows.map((r) => ({ ...r, hasAccess: r.hasAccess !== null }))
    );
  }

  // selective or invite_only — only explicitly granted customers
  const rows = await db
    .select({
      id: customers.id,
      name: users.name,
      email: users.email,
      type: customers.type,
      industry: customers.industry,
      status: customers.status,
      grantedAt: brandAccess.grantedAt,
    })
    .from(brandAccess)
    .innerJoin(customers, eq(brandAccess.customerId, customers.id))
    .innerJoin(users, eq(customers.userId, users.id))
    .where(eq(brandAccess.brandId, brandId));

  return NextResponse.json(rows.map((r) => ({ ...r, hasAccess: true })));
}
