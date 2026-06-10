import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { brands } from "@/lib/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  await requirePlatformAdmin();

  const allBrands = await db
    .select({
      id: brands.id,
      name: brands.name,
      category: brands.category,
      adminEmail: brands.adminEmail,
      fulfillmentEmail: brands.fulfillmentEmail,
      status: brands.status,
      accessPolicy: brands.accessPolicy,
      createdAt: brands.createdAt,
    })
    .from(brands)
    .orderBy(asc(brands.createdAt));

  return NextResponse.json(allBrands);
}
