/**
 * Shared brand-scoped query helpers.
 *
 * All functions enforce `WHERE brand_id = brandId` — never skip this.
 * Never pass brandId from client input; always derive it from the session.
 */

import { db } from "@/lib/db";
import { brands, brandAdmins, products, brandAccess, giftingAllowances, orders } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// ─── Brand ────────────────────────────────────────────────────────────────────

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

// ─── Products ─────────────────────────────────────────────────────────────────

export async function getBrandProducts(brandId: string) {
  return db
    .select()
    .from(products)
    .where(eq(products.brandId, brandId))
    .orderBy(products.createdAt);
}

export async function getBrandProduct(brandId: string, productId: string) {
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, productId), eq(products.brandId, brandId)))
    .limit(1);
  return product ?? null;
}

// ─── Access ───────────────────────────────────────────────────────────────────

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

// ─── Gifting ──────────────────────────────────────────────────────────────────

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

// ─── Orders ───────────────────────────────────────────────────────────────────

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
