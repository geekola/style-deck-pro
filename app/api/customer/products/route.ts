import { NextRequest, NextResponse } from "next/server";
import { requireCustomer } from "@/lib/auth-session";
import { db } from "@/lib/db";
import {
  products,
  productImages,
  brands,
  brandAccess,
  customers,
  swipeEvents,
} from "@/lib/db/schema";
import { eq, and, notInArray, inArray, or, sql } from "drizzle-orm";

/**
 * GET /api/customer/products?category=casual&limit=20
 *
 * Returns the discovery feed for the current customer:
 * - Only active products
 * - Only from brands the customer has access to (explicit row OR open policy)
 * - Excludes already-swiped products
 * - Filtered by category if provided
 * - Randomly shuffled (ORDER BY RANDOM() for MVP)
 * - Never returns costPrice
 */
export async function GET(request: NextRequest) {
  const session = await requireCustomer();
  const { searchParams } = request.nextUrl;
  const category = searchParams.get("category") as
    | "casual"
    | "business"
    | "formal"
    | "custom"
    | null;
  const itemType = searchParams.get("itemType") as "gift" | "purchase" | null;
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);

  // Get customer record
  const [customer] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.userId, session.user.id))
    .limit(1);

  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  // Get brand IDs this customer has access to (explicit grants)
  const grantedAccess = await db
    .select({ brandId: brandAccess.brandId })
    .from(brandAccess)
    .where(eq(brandAccess.customerId, customer.id));

  const grantedBrandIds = grantedAccess.map((r) => r.brandId);

  // Get already-swiped product IDs
  const swiped = await db
    .select({ productId: swipeEvents.productId })
    .from(swipeEvents)
    .where(eq(swipeEvents.customerId, customer.id));

  const swipedIds = swiped.map((r) => r.productId);

  // Build the product query
  // Access condition: brand has open policy OR customer has an explicit access row
  const accessCondition =
    grantedBrandIds.length > 0
      ? or(
          eq(brands.accessPolicy, "open"),
          inArray(products.brandId, grantedBrandIds)
        )
      : eq(brands.accessPolicy, "open");

  const baseConditions = [
    eq(products.active, true),
    eq(brands.status, "approved"),
    accessCondition!,
    ...(category ? [eq(products.category, category)] : []),
    ...(itemType ? [eq(products.itemType, itemType)] : []),
    ...(swipedIds.length > 0 ? [notInArray(products.id, swipedIds)] : []),
  ];

  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      category: products.category,
      itemType: products.itemType,
      description: products.description,
      price: products.price,
      returnPolicy: products.returnPolicy,
      brandId: products.brandId,
      brandName: brands.name,
    })
    .from(products)
    .innerJoin(brands, eq(products.brandId, brands.id))
    .where(and(...baseConditions))
    .orderBy(sql`RANDOM()`)
    .limit(limit);

  // Attach hero images
  if (rows.length === 0) return NextResponse.json([]);

  const productIds = rows.map((r) => r.id);
  const images = await db
    .select({ productId: productImages.productId, url: productImages.url })
    .from(productImages)
    .where(and(inArray(productImages.productId, productIds), eq(productImages.hero, true)));

  const imageMap = new Map(images.map((i) => [i.productId, i.url]));

  return NextResponse.json(
    rows.map((p) => ({ ...p, heroImage: imageMap.get(p.id) ?? null }))
  );
}
