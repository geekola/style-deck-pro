import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireBrandAdmin } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { orders, products, customers, users, brands } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { audit, AuditAction } from "@/lib/audit";
import { getBrandOrder } from "@/lib/db/queries/brand";
import { sendOrderShippedEmail } from "@/lib/email";

// GET /api/brand/orders/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { brandId } = await requireBrandAdmin();
  const { id } = await params;

  const [row] = await db
    .select({
      id: orders.id,
      orderType: orders.orderType,
      status: orders.status,
      amountCents: orders.amountCents,
      trackingNumber: orders.trackingNumber,
      shippingAddress: orders.shippingAddress,
      createdAt: orders.createdAt,
      shippedAt: orders.shippedAt,
      productId: products.id,
      productName: products.name,
      productCategory: products.category,
      brandName: brands.name,
      customerId: customers.id,
      customerName: users.name,
      customerEmail: users.email,
    })
    .from(orders)
    .innerJoin(products, eq(orders.productId, products.id))
    .innerJoin(brands, eq(orders.brandId, brands.id))
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .innerJoin(users, eq(customers.userId, users.id))
    .where(and(eq(orders.id, id), eq(orders.brandId, brandId)))
    .limit(1);

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    ...row,
    createdAt: row.createdAt.toISOString(),
    shippedAt: row.shippedAt ? row.shippedAt.toISOString() : null,
  });
}

const schema = z.object({
  status: z.literal("shipped"),
  trackingNumber: z.string().min(1).max(200).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, brandId } = await requireBrandAdmin();
  const { id } = await params;

  const order = await getBrandOrder(brandId, id);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (order.status === "shipped") {
    return NextResponse.json({ error: "Order already shipped" }, { status: 409 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  await db
    .update(orders)
    .set({
      status: "shipped",
      trackingNumber: parsed.data.trackingNumber ?? null,
      shippedAt: new Date(),
    })
    .where(and(eq(orders.id, id), eq(orders.brandId, brandId)));

  await audit({
    actorId: session.user.id,
    action: AuditAction.ORDER_SHIPPED,
    entityType: "order",
    entityId: id,
    metadata: { trackingNumber: parsed.data.trackingNumber },
    ip: request.headers.get("x-forwarded-for") ?? undefined,
  });

  // Send shipped notification to customer
  const [detail] = await db
    .select({
      customerEmail: users.email,
      customerName: users.name,
      productName: products.name,
      brandName: brands.name,
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .innerJoin(users, eq(customers.userId, users.id))
    .innerJoin(products, eq(orders.productId, products.id))
    .innerJoin(brands, eq(orders.brandId, brands.id))
    .where(eq(orders.id, id))
    .limit(1);

  if (detail) {
    sendOrderShippedEmail({
      to: detail.customerEmail,
      customerName: detail.customerName,
      productName: detail.productName,
      brandName: detail.brandName,
      orderId: id,
      trackingNumber: parsed.data.trackingNumber,
    }).catch(console.error);
  }

  return NextResponse.json({ id, status: "shipped" });
}
