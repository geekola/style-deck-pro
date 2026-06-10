import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { users, customers } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  await requirePlatformAdmin();

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      emailVerified: users.emailVerified,
      createdAt: users.createdAt,
      customerType: customers.type,
      customerStatus: customers.status,
    })
    .from(users)
    .leftJoin(customers, eq(customers.userId, users.id))
    .orderBy(desc(users.createdAt));

  return NextResponse.json(rows);
}
