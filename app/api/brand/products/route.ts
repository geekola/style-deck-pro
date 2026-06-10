import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireBrandAdmin } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { products, productImages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { audit, AuditAction } from "@/lib/audit";
import { getBrandProducts, assertBrandApproved } from "@/lib/db/queries/brand";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.enum(["casual", "business", "formal", "custom"]),
  itemType: z.enum(["gift", "purchase"]),
  description: z.string().max(2000).optional(),
  costPrice: z.number().int().positive().optional(), // cents
  price: z.number().int().positive().optional(),     // cents
  returnPolicy: z.string().max(1000).optional(),
});

export async function GET() {
  const { brandId } = await requireBrandAdmin();
  const rows = await getBrandProducts(brandId);

  // Never return costPrice — strip it here
  return NextResponse.json(
    rows.map(({ costPrice: _cost, ...p }) => p)
  );
}

export async function POST(request: NextRequest) {
  const { session, brandId } = await requireBrandAdmin();
  await assertBrandApproved(brandId);

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const [product] = await db
    .insert(products)
    .values({ ...parsed.data, brandId })
    .returning({ id: products.id });

  await audit({
    actorId: session.user.id,
    action: AuditAction.PRODUCT_CREATED,
    entityType: "product",
    entityId: product.id,
    metadata: { name: parsed.data.name },
    ip: request.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ id: product.id }, { status: 201 });
}
