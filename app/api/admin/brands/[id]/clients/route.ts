import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { brandAccess, customers, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { audit, AuditAction } from "@/lib/audit";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requirePlatformAdmin();
  const { id } = await params;

  const rows = await db
    .select({
      customerId: customers.id,
      name: users.name,
      email: users.email,
      type: customers.type,
      industry: customers.industry,
      grantedAt: brandAccess.grantedAt,
      status: customers.status,
    })
    .from(brandAccess)
    .innerJoin(customers, eq(customers.id, brandAccess.customerId))
    .innerJoin(users, eq(users.id, customers.userId))
    .where(eq(brandAccess.brandId, id));

  return NextResponse.json(rows);
}

const schema = z.object({
  customerId: z.string().uuid(),
  grant: z.boolean(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requirePlatformAdmin();
  const { id: brandId } = await params;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { customerId, grant } = parsed.data;

  if (grant) {
    await db.insert(brandAccess).values({ brandId, customerId }).onConflictDoNothing();
    await audit({
      actorId: session.user.id,
      action: AuditAction.ACCESS_GRANTED,
      entityType: "brand_access",
      entityId: `${brandId}:${customerId}`,
      ip: request.headers.get("x-forwarded-for") ?? undefined,
    });
  } else {
    await db.delete(brandAccess).where(
      and(eq(brandAccess.brandId, brandId), eq(brandAccess.customerId, customerId))
    );
    await audit({
      actorId: session.user.id,
      action: AuditAction.ACCESS_REVOKED,
      entityType: "brand_access",
      entityId: `${brandId}:${customerId}`,
      ip: request.headers.get("x-forwarded-for") ?? undefined,
    });
  }

  return NextResponse.json({ customerId, grant });
}
