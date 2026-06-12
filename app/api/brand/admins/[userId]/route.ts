import { NextRequest, NextResponse } from "next/server";
import { requireBrandAdmin } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { brandAdmins } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { audit, AuditAction } from "@/lib/audit";

/**
 * DELETE /api/brand/admins/[userId]
 * Self-service: remove another admin's access to the caller's own brand.
 * Can't remove yourself, and can't remove the last admin on the brand.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { session, brandId } = await requireBrandAdmin();
  const { userId } = await params;

  if (userId === session.user.id) {
    return NextResponse.json(
      { error: "You can't remove your own access. Ask another admin on this brand." },
      { status: 400 }
    );
  }

  const teamCount = await db
    .select({ id: brandAdmins.id })
    .from(brandAdmins)
    .where(eq(brandAdmins.brandId, brandId));

  if (teamCount.length <= 1) {
    return NextResponse.json(
      { error: "Can't remove the last admin on this brand." },
      { status: 400 }
    );
  }

  const deleted = await db
    .delete(brandAdmins)
    .where(and(eq(brandAdmins.brandId, brandId), eq(brandAdmins.userId, userId)))
    .returning({ id: brandAdmins.id });

  if (deleted.length === 0) {
    return NextResponse.json({ error: "Brand admin not found" }, { status: 404 });
  }

  await audit({
    actorId: session.user.id,
    action: AuditAction.BRAND_ADMIN_REMOVED,
    entityType: "brand",
    entityId: brandId,
    metadata: { userId },
    ip: request.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ userId, removed: true });
}
