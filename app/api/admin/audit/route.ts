import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { auditLogs, users } from "@/lib/db/schema";
import { eq, desc, like } from "drizzle-orm";

export async function GET(request: NextRequest) {
  await requirePlatformAdmin();

  const { searchParams } = request.nextUrl;
  const entityType = searchParams.get("entityType");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "100"), 500);

  const rows = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      metadata: auditLogs.metadata,
      ip: auditLogs.ip,
      createdAt: auditLogs.createdAt,
      actorName: users.name,
      actorEmail: users.email,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.actorId, users.id))
    .where(entityType ? eq(auditLogs.entityType, entityType) : undefined)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);

  return NextResponse.json(rows);
}
