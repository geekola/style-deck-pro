/**
 * Platform-admin dashboard query helpers.
 */

import { db } from "@/lib/db";
import { brands, auditLogs, users } from "@/lib/db/schema";
import { eq, desc, asc } from "drizzle-orm";

// Oldest pending brand applications first — used for the "Needs approval" dashboard list.
export async function getPendingBrands(limit = 5) {
  return db
    .select({
      id: brands.id,
      name: brands.name,
      category: brands.category,
      adminEmail: brands.adminEmail,
      createdAt: brands.createdAt,
    })
    .from(brands)
    .where(eq(brands.status, "pending"))
    .orderBy(asc(brands.createdAt))
    .limit(limit);
}

// Most recent platform-wide audit log entries — used for the dashboard activity feed.
export async function getRecentAuditLogs(limit = 6) {
  return db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      createdAt: auditLogs.createdAt,
      actorName: users.name,
      actorEmail: users.email,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.actorId, users.id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}
