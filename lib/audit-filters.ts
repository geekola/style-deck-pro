import { auditLogs, users } from "@/lib/db/schema";
import { eq, and, gte, lte, ilike, type SQL } from "drizzle-orm";

/**
 * Shared filter-building logic for both the audit log JSON listing and the
 * CSV export.
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
