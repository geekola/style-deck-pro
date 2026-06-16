import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireBrandAdmin } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { brands } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/brand
 * Returns brand info including settings needed for the account page.
 */
export async function GET() {
  const { brandId } = await requireBrandAdmin();

  const [brand] = await db
    .select({
      id: brands.id,
      name: brands.name,
      category: brands.category,
      status: brands.status,
      logoUrl: brands.logoUrl,
      fulfillmentEmail: brands.fulfillmentEmail,
      accessPolicy: brands.accessPolicy,
    })
    .from(brands)
    .where(eq(brands.id, brandId))
    .limit(1);

  if (!brand) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(brand);
}

const putSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  category: z.enum(["casual", "business", "formal", "custom"]).optional(),
  fulfillmentEmail: z.string().email().optional(),
  accessPolicy: z.enum(["open", "selective", "invite_only"]).optional(),
});

/**
 * PUT /api/brand
 * Updates brand settings: name, category, fulfillmentEmail, accessPolicy.
 */
export async function PUT(request: NextRequest) {
  const { brandId } = await requireBrandAdmin();
  const body = await request.json().catch(() => ({}));
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const updates = parsed.data;
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }
  await db.update(brands).set(updates).where(eq(brands.id, brandId));
  return NextResponse.json({ ok: true });
}
