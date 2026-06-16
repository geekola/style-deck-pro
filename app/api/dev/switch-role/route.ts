import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, brands, brandAdmins, customers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth-session";

const VALID_ROLES = ["platform_admin", "brand_admin", "customer"] as const;
type Role = (typeof VALID_ROLES)[number];

const DEV_BRAND_NAME = "__Dev Test Brand__";

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const role = body?.role as Role | undefined;

  if (!role || !VALID_ROLES.includes(role)) {
    return NextResponse.json(
      { error: `role must be one of: ${VALID_ROLES.join(", ")}` },
      { status: 400 }
    );
  }

  const userId = session.user.id;

  // 1. Update role in users table
  await db.update(users).set({ role }).where(eq(users.id, userId));

  // 2. Ensure supporting records exist
  if (role === "brand_admin") {
    await ensureDevBrand(userId);
  }

  if (role === "customer") {
    await ensureCustomerRecord(userId);
  }

  // 3. Build response with updated sd_role cookie
  const response = NextResponse.json({ success: true, role });

  response.cookies.set("sd_role", role, {
    httpOnly: false,
    path: "/",
    sameSite: "lax",
    secure: false, // dev only
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}

async function ensureDevBrand(userId: string) {
  // Upsert the dev test brand
  let [brand] = await db
    .select({ id: brands.id })
    .from(brands)
    .where(eq(brands.name, DEV_BRAND_NAME))
    .limit(1);

  if (!brand) {
    [brand] = await db
      .insert(brands)
      .values({
        name: DEV_BRAND_NAME,
        category: "casual",
        adminEmail: "dev@styledeck.test",
        fulfillmentEmail: "dev@styledeck.test",
        status: "approved",
        accessPolicy: "open",
      })
      .returning({ id: brands.id });
  } else {
    // Make sure it's approved so brand portal is accessible
    await db.update(brands).set({ status: "approved" }).where(eq(brands.id, brand.id));
  }

  // Upsert brandAdmins record
  const [existing] = await db
    .select({ id: brandAdmins.id })
    .from(brandAdmins)
    .where(and(eq(brandAdmins.userId, userId), eq(brandAdmins.brandId, brand.id)))
    .limit(1);

  if (!existing) {
    await db.insert(brandAdmins).values({ userId, brandId: brand.id });
  }
}

async function ensureCustomerRecord(userId: string) {
  const [existing] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.userId, userId))
    .limit(1);

  if (!existing) {
    await db.insert(customers).values({
      userId,
      type: "actor",
      industry: "film",
      status: "active",
    });
  }
}
