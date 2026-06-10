import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireBrandAdmin } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { giftingAllowances } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { audit, AuditAction } from "@/lib/audit";

const updateSchema = z.object({
  amountCents: z.number().int().nonnegative().optional(),
  periodType: z.enum(["rolling", "calendar"]).optional(),
  periodStart: z.string().datetime().optional(),
  reset: z.boolean().optional(), // manual reset of usedCents
});

const createSchema = z.object({
  customerId: z.string().uuid(),
  amountCents: z.number().int().nonnegative(),
  periodType: z.enum(["rolling", "calendar"]),
  periodStart: z.string().datetime(),
});

// POST /api/brand/gifting — create a new allowance
export async function POST(request: NextRequest) {
  const { session, brandId } = await requireBrandAdmin();

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const [row] = await db
    .insert(giftingAllowances)
    .values({
      brandId,
      customerId: parsed.data.customerId,
      amountCents: parsed.data.amountCents,
      periodType: parsed.data.periodType,
      periodStart: new Date(parsed.data.periodStart),
    })
    .onConflictDoNothing()
    .returning({ id: giftingAllowances.id });

  await audit({
    actorId: session.user.id,
    action: AuditAction.GIFTING_ALLOWANCE_SET,
    entityType: "gifting_allowance",
    entityId: row?.id ?? parsed.data.customerId,
    metadata: { amountCents: parsed.data.amountCents },
    ip: request.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ id: row?.id }, { status: 201 });
}

// PUT /api/brand/gifting/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, brandId } = await requireBrandAdmin();
  const { id } = await params;

  const [allowance] = await db
    .select()
    .from(giftingAllowances)
    .where(and(eq(giftingAllowances.id, id), eq(giftingAllowances.brandId, brandId)))
    .limit(1);

  if (!allowance) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const updates: Partial<typeof giftingAllowances.$inferInsert> = {};
  if (parsed.data.amountCents !== undefined) updates.amountCents = parsed.data.amountCents;
  if (parsed.data.periodType !== undefined) updates.periodType = parsed.data.periodType;
  if (parsed.data.periodStart !== undefined) updates.periodStart = new Date(parsed.data.periodStart);
  if (parsed.data.reset) {
    updates.usedCents = 0;
    updates.manualResetAt = new Date();
  }

  await db
    .update(giftingAllowances)
    .set(updates)
    .where(and(eq(giftingAllowances.id, id), eq(giftingAllowances.brandId, brandId)));

  await audit({
    actorId: session.user.id,
    action: parsed.data.reset
      ? AuditAction.GIFTING_ALLOWANCE_RESET
      : AuditAction.GIFTING_ALLOWANCE_SET,
    entityType: "gifting_allowance",
    entityId: id,
    metadata: updates,
    ip: request.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ id });
}
