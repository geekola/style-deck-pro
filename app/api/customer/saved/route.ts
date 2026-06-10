import { NextRequest, NextResponse } from "next/server";
import { requireCustomer } from "@/lib/auth-session";
import { db } from "@/lib/db";
import {
  savedProducts,
  products,
  productImages,
  brands,
  brandAccess,
  customers,
} from "@/lib/db/schema";
import { eq, and, or, inArray } from "drizzle-orm";

/**
 * GET /api/customer/saved
 *
 * Returns saved products, filtered to hide items where brand access was revoked.
 * Products from open-policy brands are always visible.
 * Never returns costPrice.
 */
export async function GET() {
  const session = await requireCustomer();

  const [customer] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.userId, session.user.id))
    .limit(1);

  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  // Get brands this customer has explicit access to
  const grants = await db
    .select({ brandId: brandAccess.brandId })
    .from(brandAccess)
    .where(eq(brandAccess.customerId, customer.id));

  const grantedBrandIds = grants.map((g) => g.brandId);

  // Fetch saved products with brand info — only where access is still valid
  const accessCondition =
    grantedBrandIds.length > 0
      ? or(eq(brands.accessPolicy, "open"), inArray(products.brandId, grantedBrandIds))
      : eq(brands.accessPolicy, "open");

  const rows = await db
    .select({
      savedId: savedProducts.id,
      savedAt: savedProducts.savedAt,
      id: products.id,
      name: products.name,
      category: products.category,
      itemType: products.itemType,
      price: products.price,
      brandId: products.brandId,
      brandName: brands.name,
      active: products.active,
    })
    .from(savedProducts)
    .innerJoin(products, eq(savedProducts.productId, products.id))
    .innerJoin(brands, eq(products.brandId, brands.id))
    .where(
      and(eq(savedProducts.customerId, customer.id), accessCondition!)
    )
    .orderBy(savedProducts.savedAt);

  if (rows.length === 0) return NextResponse.json([]);

  // Attach hero images
  const productIds = rows.map((r) => r.id);
  const images = await db
    .select({ productId: productImages.productId, url: productImages.url })
    .from(productImages)
    .where(and(inArray(productImages.productId, productIds), eq(productImages.hero, true)));

  const imageMap = new Map(images.map((i) => [i.productId, i.url]));

  return NextResponse.json(
    rows.map((r) => ({ ...r, heroImage: imageMap.get(r.id) ?? null }))
  );
}

/**
 * DELETE /api/customer/saved?productId=xxx
 * Remove a product from the saved list.
 */
export async function DELETE(request: NextRequest) {
  const session = await requireCustomer();
  const productId = request.nextUrl.searchParams.get("productId");

  if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 });

  const [customer] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.userId, session.user.id))
    .limit(1);

  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db
    .delete(savedProducts)
    .where(
      and(
        eq(savedProducts.customerId, customer.id),
        eq(savedProducts.productId, productId)
      )
    );

  return new Response(null, { status: 204 });
}
