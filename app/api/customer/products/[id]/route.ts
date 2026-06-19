import { NextRequest, NextResponse } from "next/server";
import { requireCustomer } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { products, productImages, brands, brandAccess, customers } from "@/lib/db/schema";
import { eq, and, inArray, or } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await requireCustomer();

  const [customer] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.userId, session.user.id))
    .limit(1);

  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const grantedAccess = await db
    .select({ brandId: brandAccess.brandId })
    .from(brandAccess)
    .where(eq(brandAccess.customerId, customer.id));

  const grantedBrandIds = grantedAccess.map((r) => r.brandId);

  const accessCondition =
    grantedBrandIds.length > 0
      ? or(eq(brands.accessPolicy, "open"), inArray(products.brandId, grantedBrandIds))
      : eq(brands.accessPolicy, "open");

  const [row] = await db
    .select({
      id: products.id,
      name: products.name,
      category: products.category,
      itemType: products.itemType,
      description: products.description,
      price: products.price,
      brandId: products.brandId,
      brandName: brands.name,
      brandLogoUrl: brands.logoUrl,
    })
    .from(products)
    .innerJoin(brands, eq(products.brandId, brands.id))
    .where(
      and(
        eq(products.id, id),
        eq(products.visibility, "live"),
        eq(brands.status, "approved"),
        accessCondition!
      )
    )
    .limit(1);

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [heroImg] = await db
    .select({ url: productImages.url })
    .from(productImages)
    .where(and(eq(productImages.productId, id), eq(productImages.hero, true)))
    .limit(1);

  return NextResponse.json({ ...row, heroImage: heroImg?.url ?? null });
}
