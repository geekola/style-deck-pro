import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { auditLogs, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { buildAuditFilters } from "../route";

const MAX_ROWS = 10000;

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = typeof value === "string" ? value : JSON.stringify(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * GET /api/admin/audit/export — CSV download of the audit log, honoring the
 * same entityType / actorEmail / from / to filters as the JSON listing.
 */
export async function GET(request: NextRequest) {
  await requirePlatformAdmin();

  const { searchParams } = request.nextUrl;
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
    .limit(MAX_ROWS);

  const header = [
    "timestamp",
    "action",
    "entity_type",
    "entity_id",
    "actor_name",
    "actor_email",
    "ip",
    "metadata",
  ];

  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push(
      [
        csvEscape(row.createdAt.toISOString()),
        csvEscape(row.action),
        csvEscape(row.entityType),
        csvEscape(row.entityId),
        csvEscape(row.actorName),
        csvEscape(row.actorEmail),
        csvEscape(row.ip),
        csvEscape(row.metadata),
      ].join(",")
    );
  }

  const csv = lines.join("\n");
  const filename = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
