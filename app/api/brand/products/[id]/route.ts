import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireBrandAdmin } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { products, productImages } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { audit, AuditAction } from "@/lib/audit";
import { getBrandProduct } from "@/lib/db/queries/brand";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  category: z.enum(["casual", "business", "formal", "custom"]).optional(),
  itemType: z.enum(["gift", "purchase"]).optional(),
  description: z.string().max(2000).optional(),
  costPrice: z.number().int().positive().optional(),
  price: z.number().int().positive().optional(),
  returnPolicy: z.string().max(1000).optional(),
  active: z.boolean().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { brandId } = await requireBrandAdmin();
  const { id } = await params;

  const product = await getBrandProduct(brandId, id);
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const images = await db
    .select({ id: productImages.id, url: productImages.url, hero: productImages.hero, displayOrder: productImages.displayOrder })
    .from(productImages)
    .where(eq(productImages.productId, id))
    .orderBy(productImages.displayOrder);

  // Note: costPrice is included here — this endpoint is brand-admin scoped
  // (requireBrandAdmin), so the brand viewing/editing its own product cost
  // is expected. It must never be exposed via customer-facing routes.
  return NextResponse.json({ ...product, images });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, brandId } = await requireBrandAdmin();
  const { id } = await params;

  const product = await getBrandProduct(brandId, id);
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  await db
    .update(products)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(products.id, id), eq(products.brandId, brandId)));

  // Determine audit action
  let action: string = AuditAction.PRODUCT_UPDATED;
  if (parsed.data.active === true) action = AuditAction.PRODUCT_ACTIVATED;
  if (parsed.data.active === false) action = AuditAction.PRODUCT_DEACTIVATED;

  await audit({
    actorId: session.user.id,
    action,
    entityType: "product",
    entityId: id,
    ip: request.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ id });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, brandId } = await requireBrandAdmin();
  const { id } = await params;

  const product = await getBrandProduct(brandId, id);
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db
    .delete(products)
    .where(and(eq(products.id, id), eq(products.brandId, brandId)));

  await audit({
    actorId: session.user.id,
    action: AuditAction.PRODUCT_DELETED,
    entityType: "product",
    entityId: id,
    ip: request.headers.get("x-forwarded-for") ?? undefined,
  });

  return new Response(null, { status: 204 });
}
