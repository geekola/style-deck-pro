import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth-session";
import { db } from "@/lib/db";
import {
  products,
  brandAccess,
  orders,
  swipeEvents,
} from "@/lib/db/schema";
import { eq, and, count, sql } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requirePlatformAdmin();
  const { id } = await params;

  const [
    [{ totalProducts }],
    [{ activeClients }],
    [{ giftedItems }],
    [{ pendingGifts }],
    swipeStats,
  ] = await Promise.all([
    // Total products for this brand
    db
      .select({ totalProducts: count() })
      .from(products)
      .where(eq(products.brandId, id)),

    // Active clients (brand access rows)
    db
      .select({ activeClients: count() })
      .from(brandAccess)
      .where(eq(brandAccess.brandId, id)),

    // Total gifted items (orders of type gift)
    db
      .select({ giftedItems: count() })
      .from(orders)
      .where(and(eq(orders.brandId, id), eq(orders.orderType, "gift"))),

    // Pending gift requests
    db
      .select({ pendingGifts: count() })
      .from(orders)
      .where(
        and(
          eq(orders.brandId, id),
          eq(orders.orderType, "gift"),
          eq(orders.status, "pending")
        )
      ),

    // Swipe stats via products join
    db
      .select({
        total: count(),
        rights: sql<number>`count(*) filter (where ${swipeEvents.direction} = 'right')`,
      })
      .from(swipeEvents)
      .innerJoin(products, eq(products.id, swipeEvents.productId))
      .where(eq(products.brandId, id)),
  ]);

  const total = Number(swipeStats[0]?.total ?? 0);
  const rights = Number(swipeStats[0]?.rights ?? 0);
  const acceptanceRate = total > 0 ? Math.round((rights / total) * 100) : null;

  return NextResponse.json({
    totalProducts: Number(totalProducts),
    activeClients: Number(activeClients),
    giftedItems: Number(giftedItems),
    pendingGifts: Number(pendingGifts),
    acceptanceRate,
  });
}
