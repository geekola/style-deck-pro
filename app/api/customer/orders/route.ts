import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCustomer } from "@/lib/auth-session";
import { db } from "@/lib/db";
import {
  orders,
  products,
  customers,
  measurements,
  giftingAllowances,
  brands,
  brandAccess,
} from "@/lib/db/schema";
import { eq, and, or, inArray } from "drizzle-orm";
import { stripe } from "@/lib/stripe";
import { audit, AuditAction } from "@/lib/audit";
import { sendOrderNotificationEmail } from "@/lib/email";

const shippingSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().min(2).max(2),
});

const orderSchema = z.discriminatedUnion("orderType", [
  z.object({
    orderType: z.literal("purchase"),
    productId: z.string().uuid().optional(),
    productIds: z.array(z.string().uuid()).min(1).max(10).optional(),
    shippingAddress: shippingSchema,
  }),
  z.object({
    orderType: z.literal("gift"),
    productId: z.string().uuid(),
    shippingAddress: shippingSchema,
  }),
]);

async function assertMeasurementsComplete(customerId: string) {
  const [m] = await db
    .select({ id: measurements.id })
    .from(measurements)
    .where(eq(measurements.customerId, customerId))
    .limit(1);
  if (!m) {
    throw new Response(
      JSON.stringify({ error: "Complete your measurement profile before ordering" }),
      { status: 422, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function assertCustomerHasProductAccess(customerId: string, product: typeof products.$inferSelect) {
  const [brand] = await db
    .select({ accessPolicy: brands.accessPolicy, status: brands.status })
    .from(brands)
    .where(eq(brands.id, product.brandId))
    .limit(1);

  if (!brand || brand.status !== "approved") {
    throw new Response(JSON.stringify({ error: "Product not available" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (brand.accessPolicy !== "open") {
    const [access] = await db
      .select({ id: brandAccess.id })
      .from(brandAccess)
      .where(and(eq(brandAccess.brandId, product.brandId), eq(brandAccess.customerId, customerId)))
      .limit(1);

    if (!access) {
      throw new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
  }
}

/**
 * POST /api/customer/orders
 *
 * For gift orders: creates order immediately (no payment).
 * For purchase orders: creates a Stripe Checkout session and returns the URL.
 * The order record is created in the webhook for purchases.
 */
export async function POST(request: NextRequest) {
  const session = await requireCustomer();

  const body = await request.json().catch(() => null);
  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
  }

  if (
    parsed.data.orderType === "purchase" &&
    !parsed.data.productId &&
    !parsed.data.productIds?.length
  ) {
    return NextResponse.json({ error: "productId or productIds is required" }, { status: 400 });
  }

  const { shippingAddress } = parsed.data;

  // Get customer
  const [customer] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.userId, session.user.id))
    .limit(1);

  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  // Measurements required
  await assertMeasurementsComplete(customer.id);

  // ── Gift order ──────────────────────────────────────────────────────────────
  if (parsed.data.orderType === "gift") {
    const productId = parsed.data.productId;

    // Get product
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, productId), eq(products.active, true)))
      .limit(1);

    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    // Verify access
    await assertCustomerHasProductAccess(customer.id, product);

    if (product.itemType !== "gift") {
      return NextResponse.json({ error: "This product is not available as a gift" }, { status: 400 });
    }

    // Check gifting allowance
    const [allowance] = await db
      .select()
      .from(giftingAllowances)
      .where(
        and(
          eq(giftingAllowances.brandId, product.brandId),
          eq(giftingAllowances.customerId, customer.id)
        )
      )
      .limit(1);

    const productCost = product.costPrice ?? 0;

    if (!allowance || allowance.usedCents + productCost > allowance.amountCents) {
      return NextResponse.json(
        { error: "Gift not available at this time" }, // vague by design
        { status: 403 }
      );
    }

    // Create order
    const [order] = await db
      .insert(orders)
      .values({
        customerId: customer.id,
        productId,
        brandId: product.brandId,
        orderType: "gift",
        status: "pending",
        amountCents: 0,
        shippingAddress,
      })
      .returning({ id: orders.id });

    // Deduct from allowance
    await db
      .update(giftingAllowances)
      .set({ usedCents: allowance.usedCents + productCost })
      .where(eq(giftingAllowances.id, allowance.id));

    // Get brand for notification
    const [brand] = await db
      .select({ fulfillmentEmail: brands.fulfillmentEmail })
      .from(brands)
      .where(eq(brands.id, product.brandId))
      .limit(1);

    await audit({
      actorId: session.user.id,
      action: AuditAction.ORDER_PLACED,
      entityType: "order",
      entityId: order.id,
      metadata: { orderType: "gift", productId },
      ip: request.headers.get("x-forwarded-for") ?? undefined,
    });

    sendOrderNotificationEmail({
      to: brand?.fulfillmentEmail ?? "",
      orderId: order.id,
      customerName: session.user.name,
      productName: product.name,
      orderType: "gift",
      shippingAddress,
    }).catch(console.error);

    return NextResponse.json({ orderId: order.id, orderType: "gift" }, { status: 201 });
  }

  // ── Purchase order(s) ──────────────────────────────────────────────────────
  // Supports both a single product (productId) and multiple products from the
  // same brand checked out together (productIds), e.g. from the Saved page.
  const productIds = parsed.data.productIds ?? [parsed.data.productId!];

  const purchaseProducts = await db
    .select()
    .from(products)
    .where(and(inArray(products.id, productIds), eq(products.active, true)));

  if (purchaseProducts.length !== productIds.length) {
    return NextResponse.json({ error: "One or more products not found" }, { status: 404 });
  }

  if (purchaseProducts.some((p) => p.itemType !== "purchase" || !p.price)) {
    return NextResponse.json({ error: "One or more products are not available for purchase" }, { status: 400 });
  }

  const brandId = purchaseProducts[0].brandId;
  if (purchaseProducts.some((p) => p.brandId !== brandId)) {
    return NextResponse.json({ error: "All items in an order must be from the same brand" }, { status: 400 });
  }

  // Verify access (same brand for all items, so checking one product suffices)
  await assertCustomerHasProductAccess(customer.id, purchaseProducts[0]);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: purchaseProducts.map((p) => ({
      price_data: {
        currency: "usd",
        unit_amount: p.price!,
        product_data: { name: p.name },
      },
      quantity: 1,
    })),
    metadata: {
      customerId: customer.id,
      productIds: JSON.stringify(productIds),
      brandId,
      userId: session.user.id,
      shippingAddress: JSON.stringify(shippingAddress),
    },
    success_url: `${appUrl}/app/orders?success=1`,
    cancel_url: `${appUrl}/app/saved`,
  });

  return NextResponse.json({ checkoutUrl: checkoutSession.url });
}

/**
 * GET /api/customer/orders — order history
 */
export async function GET() {
  const session = await requireCustomer();

  const [customer] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.userId, session.user.id))
    .limit(1);

  if (!customer) return NextResponse.json([]);

  const rows = await db
    .select({
      id: orders.id,
      orderType: orders.orderType,
      status: orders.status,
      amountCents: orders.amountCents,
      trackingNumber: orders.trackingNumber,
      createdAt: orders.createdAt,
      shippedAt: orders.shippedAt,
      productName: products.name,
      brandName: brands.name,
    })
    .from(orders)
    .innerJoin(products, eq(orders.productId, products.id))
    .innerJoin(brands, eq(orders.brandId, brands.id))
    .where(eq(orders.customerId, customer.id))
    .orderBy(orders.createdAt);

  return NextResponse.json(rows);
}
