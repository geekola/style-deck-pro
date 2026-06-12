import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { brandAdmins, users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { audit, AuditAction } from "@/lib/audit";

const statusSchema = z.object({
  status: z.enum(["active", "suspended"]),
});

/**
 * Suspend or reactivate an individual brand admin's portal access without
 * affecting the brand itself or any other admins on the brand.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const session = await requirePlatformAdmin();
  const { id, userId } = await params;

  const body = await request.json().catch(() => null);
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const [link] = await db
    .select({ id: brandAdmins.id })
    .from(brandAdmins)
    .where(and(eq(brandAdmins.brandId, id), eq(brandAdmins.userId, userId)))
    .limit(1);

  if (!link) {
    return NextResponse.json({ error: "Brand admin not found" }, { status: 404 });
  }

  await db.update(users).set({ status: parsed.data.status }).where(eq(users.id, userId));

  await audit({
    actorId: session.user.id,
    action:
      parsed.data.status === "suspended"
        ? AuditAction.BRAND_ADMIN_SUSPENDED
        : AuditAction.BRAND_ADMIN_ACTIVATED,
    entityType: "brand",
    entityId: id,
    metadata: { userId },
    ip: request.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ userId, status: parsed.data.status });
}

/**
 * Remove a brand admin's link to this brand (unlink). The user account
 * itself is left intact -- they simply lose access to this brand's portal.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const session = await requirePlatformAdmin();
  const { id, userId } = await params;

  const deleted = await db
    .delete(brandAdmins)
    .where(and(eq(brandAdmins.brandId, id), eq(brandAdmins.userId, userId)))
    .returning({ id: brandAdmins.id });

  if (deleted.length === 0) {
    return NextResponse.json({ error: "Brand admin not found" }, { status: 404 });
  }

  await audit({
    actorId: session.user.id,
    action: AuditAction.BRAND_ADMIN_REMOVED,
    entityType: "brand",
    entityId: id,
    metadata: { userId },
    ip: request.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ userId, removed: true });
}
