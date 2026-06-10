import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireBrandAdmin } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { brandAccess, brands, customers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { audit, AuditAction } from "@/lib/audit";

const schema = z.object({
  customerId: z.string().uuid(),
  grant: z.boolean(), // true = grant, false = revoke
});

export async function POST(request: NextRequest) {
  const { session, brandId } = await requireBrandAdmin();

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { customerId, grant } = parsed.data;

  // Verify customer exists and is active
  const [customer] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.status, "active")))
    .limit(1);

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  if (grant) {
    await db
      .insert(brandAccess)
      .values({ brandId, customerId })
      .onConflictDoNothing();

    await audit({
      actorId: session.user.id,
      action: AuditAction.ACCESS_GRANTED,
      entityType: "brand_access",
      entityId: `${brandId}:${customerId}`,
      ip: request.headers.get("x-forwarded-for") ?? undefined,
    });
  } else {
    await db
      .delete(brandAccess)
      .where(and(eq(brandAccess.brandId, brandId), eq(brandAccess.customerId, customerId)));

    await audit({
      actorId: session.user.id,
      action: AuditAction.ACCESS_REVOKED,
      entityType: "brand_access",
      entityId: `${brandId}:${customerId}`,
      ip: request.headers.get("x-forwarded-for") ?? undefined,
    });
  }

  return NextResponse.json({ customerId, access: grant });
}

// PUT /api/brand/access/policy — change the brand's access policy
const policySchema = z.object({
  accessPolicy: z.enum(["open", "selective", "invite_only"]),
});

export async function PUT(request: NextRequest) {
  const { session, brandId } = await requireBrandAdmin();

  const body = await request.json().catch(() => null);
  const parsed = policySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const [prev] = await db
    .select({ accessPolicy: brands.accessPolicy })
    .from(brands)
    .where(eq(brands.id, brandId))
    .limit(1);

  await db
    .update(brands)
    .set({ accessPolicy: parsed.data.accessPolicy, updatedAt: new Date() })
    .where(eq(brands.id, brandId));

  await audit({
    actorId: session.user.id,
    action: AuditAction.ACCESS_POLICY_CHANGED,
    entityType: "brand",
    entityId: brandId,
    metadata: { from: prev?.accessPolicy, to: parsed.data.accessPolicy },
    ip: request.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ accessPolicy: parsed.data.accessPolicy });
}
