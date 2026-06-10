import { NextResponse } from "next/server";
import { requireBrandAdmin } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { orders, products, customers, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getBrandOrders } from "@/lib/db/queries/brand";

export async function GET() {
  const { brandId } = await requireBrandAdmin();

  const rows = await db
    .select({
      id: orders.id,
      orderType: orders.orderType,
      status: orders.status,
      amountCents: orders.amountCents,
      trackingNumber: orders.trackingNumber,
      shippingAddress: orders.shippingAddress,
      createdAt: orders.createdAt,
      shippedAt: orders.shippedAt,
      productName: products.name,
      customerName: users.name,
    })
    .from(orders)
    .innerJoin(products, eq(orders.productId, products.id))
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .innerJoin(users, eq(customers.userId, users.id))
    .where(eq(orders.brandId, brandId))
    .orderBy(desc(orders.createdAt));

  return NextResponse.json(rows);
}
