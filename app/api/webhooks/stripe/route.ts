import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { orders, products, brands } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { audit, AuditAction } from "@/lib/audit";
import { sendOrderNotificationEmail } from "@/lib/email";
import type Stripe from "stripe";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("[stripe webhook] signature validation failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const meta = session.metadata;

    if (!meta?.customerId || !meta?.productIds || !meta?.brandId) {
      console.error("[stripe webhook] missing metadata", meta);
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
    }

    const shippingAddress = meta.shippingAddress ? JSON.parse(meta.shippingAddress) : null;
    const productIds: string[] = JSON.parse(meta.productIds);

    // Look up current product info (name + price) for each item in the order
    const orderProducts = await db
      .select({ id: products.id, name: products.name, price: products.price })
      .from(products)
      .where(inArray(products.id, productIds));

    const productMap = new Map(orderProducts.map((p) => [p.id, p]));

    const [brand] = await db
      .select({ fulfillmentEmail: brands.fulfillmentEmail })
      .from(brands)
      .where(eq(brands.id, meta.brandId))
      .limit(1);

    // Create one order record per product, all sharing the same payment intent
    for (const productId of productIds) {
      const product = productMap.get(productId);

      const [order] = await db
        .insert(orders)
        .values({
          customerId: meta.customerId,
          productId,
          brandId: meta.brandId,
          orderType: "purchase",
          status: "pending",
          stripePaymentIntentId: session.payment_intent as string,
          amountCents: product?.price ?? 0,
          shippingAddress,
        })
        .returning({ id: orders.id });

      await audit({
        actorId: meta.userId ?? null,
        action: AuditAction.ORDER_PLACED,
        entityType: "order",
        entityId: order.id,
        metadata: { orderType: "purchase", stripeSessionId: session.id },
      });

      if (product && brand && shippingAddress) {
        sendOrderNotificationEmail({
          to: brand.fulfillmentEmail,
          orderId: order.id,
          customerName: session.customer_details?.name ?? "Customer",
          productName: product.name,
          orderType: "purchase",
          shippingAddress,
        }).catch(console.error);
      }
    }
  }

  return NextResponse.json({ received: true });
}
