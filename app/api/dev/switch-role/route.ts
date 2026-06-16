import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, brands, brandAdmins, customers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth-session";

const VALID_ROLES = ["platform_admin", "brand_admin", "customer"] as const;
type Role = (typeof VALID_ROLES)[number];

const DEV_BRAND_NAME = "__Dev Test Brand__";
const DEV_EMAIL = "dev@styledeck.test";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Only the dev switcher account can use this endpoint
  if (session.user.email !== DEV_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}

async function ensureDevBrand(userId: string) {
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
        adminEmail: DEV_EMAIL,
        fulfillmentEmail: DEV_EMAIL,
        status: "approved",
        accessPolicy: "open",
      })
      .returning({ id: brands.id });
  } else {
    await db.update(brands).set({ status: "approved" }).where(eq(brands.id, brand.id));
  }

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
