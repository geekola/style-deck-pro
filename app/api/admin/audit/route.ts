import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { auditLogs, users } from "@/lib/db/schema";
import { eq, desc, and, gte, lte, ilike, type SQL } from "drizzle-orm";

/**
 * Shared filter-building logic for both the JSON listing and the CSV export.
 */
export function buildAuditFilters(searchParams: URLSearchParams): SQL | undefined {
  const entityType = searchParams.get("entityType");
  const actorEmail = searchParams.get("actorEmail");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const conditions: SQL[] = [];

  if (entityType) conditions.push(eq(auditLogs.entityType, entityType));
  if (actorEmail) conditions.push(ilike(users.email, `%${actorEmail}%`));

  if (from) {
    const fromDate = new Date(from);
    if (!isNaN(fromDate.getTime())) conditions.push(gte(auditLogs.createdAt, fromDate));
  }

  if (to) {
    const toDate = new Date(to);
    if (!isNaN(toDate.getTime())) {
      // Treat `to` as inclusive of the whole day if only a date was given.
      if (to.length <= 10) toDate.setHours(23, 59, 59, 999);
      conditions.push(lte(auditLogs.createdAt, toDate));
    }
  }

  if (conditions.length === 0) return undefined;
  return and(...conditions);
}

export async function GET(request: NextRequest) {
  await requirePlatformAdmin();

  const { searchParams } = request.nextUrl;
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "100"), 500);
  const where = buildAuditFilters(searchParams);

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
    .where(where)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);

  return NextResponse.json(rows);
}
