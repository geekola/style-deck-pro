/**
 * Shared brand-scoped query helpers.
 *
 * All functions enforce `WHERE brand_id = brandId` -- never skip this.
 * Never pass brandId from client input; always derive it from the session.
 */

import { db } from "@/lib/db";
import { brands, products, productImages, brandAccess, giftingAllowances, orders, customers, users, savedProducts } from "@/lib/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";

// Brand

export async function getBrandById(brandId: string) {
  const [brand] = await db
    .select()
    .from(brands)
    .where(eq(brands.id, brandId))
    .limit(1);
  return brand ?? null;
}

export async function assertBrandApproved(brandId: string) {
  const brand = await getBrandById(brandId);
  if (!brand || brand.status !== "approved") {
    throw new Response("Brand not approved", { status: 403 });
  }
  return brand;
}

// Products

export async function getBrandProducts(brandId: string) {
  const prods = await db
    .select()
    .from(products)
    .where(eq(products.brandId, brandId))
    .orderBy(desc(products.createdAt));

  if (prods.length === 0) return [];

  const productIds = prods.map((p) => p.id);
  const heroImages = await db
    .select({ productId: productImages.productId, url: productImages.url })
    .from(productImages)
    .where(and(inArray(productImages.productId, productIds), eq(productImages.hero, true)));

  const heroMap = new Map(heroImages.map((i) => [i.productId, i.url]));

  return prods.map((p) => ({ ...p, thumbnailUrl: heroMap.get(p.id) ?? null }));
}

export async function getBrandProduct(brandId: string, productId: string) {
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, productId), eq(products.brandId, brandId)))
    .limit(1);
  return product ?? null;
}

// Access

export async function getBrandAccessList(brandId: string) {
  return db
    .select()
    .from(brandAccess)
    .where(eq(brandAccess.brandId, brandId));
}

export async function customerHasAccess(brandId: string, customerId: string) {
  const [row] = await db
    .select({ id: brandAccess.id })
    .from(brandAccess)
    .where(
      and(eq(brandAccess.brandId, brandId), eq(brandAccess.customerId, customerId))
    )
    .limit(1);
  return !!row;
}

// Gifting

export async function getGiftingAllowance(brandId: string, customerId: string) {
  const [row] = await db
    .select()
    .from(giftingAllowances)
    .where(
      and(
        eq(giftingAllowances.brandId, brandId),
        eq(giftingAllowances.customerId, customerId)
      )
    )
    .limit(1);
  return row ?? null;
}

export async function getBrandGiftingAllowances(brandId: string) {
  return db
    .select()
    .from(giftingAllowances)
    .where(eq(giftingAllowances.brandId, brandId));
}

// Orders

export async function getBrandOrders(brandId: string) {
  return db
    .select()
    .from(orders)
    .where(eq(orders.brandId, brandId))
    .orderBy(orders.createdAt);
}

export async function getBrandOrder(brandId: string, orderId: string) {
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.brandId, brandId)))
    .limit(1);
  return order ?? null;
}

// Oldest unshipped orders first -- used for the "Needs shipping" dashboard list.
export async function getBrandPendingOrders(brandId: string, limit = 5) {
  return db
    .select({
      id: orders.id,
      productId: orders.productId,
      productName: products.name,
      customerName: users.name,
      orderType: orders.orderType,
      amountCents: orders.amountCents,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .innerJoin(products, eq(orders.productId, products.id))
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .innerJoin(users, eq(customers.userId, users.id))
    .where(and(eq(orders.brandId, brandId), eq(orders.status, "pending")))
    .orderBy(orders.createdAt)
    .limit(limit);
}

// Activity feed

// Most recent product saves (swipe-right) -- used for the dashboard activity feed.
export async function getBrandRecentSaves(brandId: string, limit = 5) {
  return db
    .select({
      id: savedProducts.id,
      productId: savedProducts.productId,
      productName: products.name,
      customerName: users.name,
      at: savedProducts.savedAt,
    })
    .from(savedProducts)
    .innerJoin(products, eq(savedProducts.productId, products.id))
    .innerJoin(customers, eq(savedProducts.customerId, customers.id))
    .innerJoin(users, eq(customers.userId, users.id))
    .where(eq(products.brandId, brandId))
    .orderBy(desc(savedProducts.savedAt))
    .limit(limit);
}

// Most recently granted customer access -- used for the dashboard activity feed.
export async function getBrandRecentAccessGrants(brandId: string, limit = 5) {
  return db
    .select({
      id: brandAccess.id,
      customerName: users.name,
      at: brandAccess.grantedAt,
    })
    .from(brandAccess)
    .innerJoin(customers, eq(brandAccess.customerId, customers.id))
    .innerJoin(users, eq(customers.userId, users.id))
    .where(eq(brandAccess.brandId, brandId))
    .orderBy(desc(brandAccess.grantedAt))
    .limit(limit);
}
