import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

interface AuditParams {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  ip?: string;
}

/**
 * Write an audit log entry. Fire-and-forget — never throws.
 */
export async function audit(params: AuditParams): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      actorId: params.actorId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata ?? null,
      ip: params.ip ?? null,
    });
  } catch (err) {
    console.error("[audit] failed to write log", err);
  }
}

// Well-known action strings — use these to keep audit logs consistent
export const AuditAction = {
  // Brands
  BRAND_REGISTERED: "brand.registered",
  BRAND_APPROVED: "brand.approved",
  BRAND_REJECTED: "brand.rejected",
  BRAND_UPDATED: "brand.updated",
  // Products
  PRODUCT_CREATED: "product.created",
  PRODUCT_UPDATED: "product.updated",
  PRODUCT_DELETED: "product.deleted",
  PRODUCT_ACTIVATED: "product.activated",
  PRODUCT_DEACTIVATED: "product.deactivated",
  // Access
  ACCESS_GRANTED: "access.granted",
  ACCESS_REVOKED: "access.revoked",
  ACCESS_POLICY_CHANGED: "access.policy_changed",
  // Gifting
  GIFTING_ALLOWANCE_SET: "gifting.allowance_set",
  GIFTING_ALLOWANCE_RESET: "gifting.allowance_reset",
  // Invites
  INVITE_CREATED: "invite.created",
  INVITE_ACCEPTED: "invite.accepted",
  // Orders
  ORDER_PLACED: "order.placed",
  ORDER_SHIPPED: "order.shipped",
  // Admin
  USER_SUSPENDED: "user.suspended",
  USER_ACTIVATED: "user.activated",
} as const;
