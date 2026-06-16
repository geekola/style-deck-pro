import { NextRequest, NextResponse } from "next/server";
import { requireBrandAdmin } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { customers, users, measurements, brands, brandAccess } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * GET /api/brand/customers/[id]
 *
 * Returns full customer profile + measurements for a brand admin.
 * Only accessible if:
 *   - brand is "open" (all active customers visible), OR
 *   - customer has an explicit brand_access row for this brand
 *
 * Never returns gifting budget data — that's on a separate endpoint.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { brandId } = await requireBrandAdmin();
  const { id } = await params;

  // Check access policy
  const [brand] = await db
    .select({ accessPolicy: brands.accessPolicy })
    .from(brands)
    .where(eq(brands.id, brandId))
    .limit(1);

  if (!brand) return NextResponse.json({ error: "Brand not found" }, { status: 404 });

  // For selective/invite_only brands, verify the customer has access
  if (brand.accessPolicy !== "open") {
    const [access] = await db
      .select({ id: brandAccess.id })
      .from(brandAccess)
      .where(and(eq(brandAccess.brandId, brandId), eq(brandAccess.customerId, id)))
      .limit(1);

    if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [row] = await db
    .select({
      id: customers.id,
      name: users.name,
      email: users.email,
      type: customers.type,
      industry: customers.industry,
      status: customers.status,
      createdAt: customers.createdAt,
    })
    .from(customers)
    .innerJoin(users, eq(customers.userId, users.id))
    .where(eq(customers.id, id))
    .limit(1);

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [m] = await db
    .select()
    .from(measurements)
    .where(eq(measurements.customerId, id))
    .limit(1);

  return NextResponse.json({
    ...row,
    createdAt: row.createdAt.toISOString(),
    measurements: m
      ? {
          gender: m.gender,
          unitSystem: m.unitSystem,
          height: m.height,
          weight: m.weight,
          shoeSize: m.shoeSize,
          shoeWidth: m.shoeWidth,
          chest: m.chest,
          waist: m.waist,
          hips: m.hips,
          neck: m.neck,
          shoulderWidth: m.shoulderWidth,
          sleeveLength: m.sleeveLength,
          inseam: m.inseam,
          extended: m.extended,
          updatedAt: m.updatedAt.toISOString(),
        }
      : null,
  });
}
