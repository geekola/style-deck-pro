import Link from "next/link";
import { requirePlatformAdminPage } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { users, brands } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";
import { getPendingBrands, getRecentAuditLogs } from "@/lib/db/queries/admin";

const ACTION_COLORS: Record<string, string> = {
  "brand.approved": "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400",
  "brand.rejected": "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  "brand.registered": "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400",
  "order.shipped": "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400",
  "order.placed": "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400",
  "user.suspended": "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  "user.activated": "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400",
  "access.revoked": "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400",
  "access.granted": "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400",
  "product.deleted": "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
};

export default async function AdminDashboardPage() {
  await requirePlatformAdminPage();

  const [
    [totalUsers],
    [totalBrands],
    [pendingBrands],
    [suspendedBrands],
    [suspendedUsers],
    pendingBrandsList,
    recentLogs,
  ] = await Promise.all([
    db.select({ count: count() }).from(users),
    db.select({ count: count() }).from(brands).where(eq(brands.status, "approved")),
    db.select({ count: count() }).from(brands).where(eq(brands.status, "pending")),
    db.select({ count: count() }).from(brands).where(eq(brands.status, "suspended")),
    db.select({ count: count() }).from(users).where(eq(users.status, "suspended")),
    getPendingBrands(5),
    getRecentAuditLogs(6),
  ]);

  const needsAttention = suspendedBrands.count + suspendedUsers.count;

  const stats = [
    { label: "Total users", value: totalUsers.count, href: "/admin/users" },
    { label: "Approved brands", value: totalBrands.count, href: "/admin/brands" },
    {
      label: "Pending approval",
      value: pendingBrands.count,
      href: "/admin/brands",
      alert: pendingBrands.count > 0,
    },
    {
      label: "Needs attention",
      value: needsAttention,
      href: "/admin/users",
      alert: needsAttention > 0,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-8">Platform Admin</h1>

      <div className="grid grid-cols-4 gap-3 mb-10">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className={`block border rounded-lg p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60 ${s.alert ? "border-amber-300 bg-amber-50" : "border-gray-200 dark:border-gray-700"}`}
          >
            <div className={`text-2xl font-semibold ${s.alert ? "text-amber-700" : ""}`}>
              {s.value}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">{s.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Needs approval
          </h2>
          {pendingBrandsList.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">Nothing pending approval.</p>
          ) : (
            <ul className="space-y-2">
              {pendingBrandsList.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/admin/brands#brand-${b.id}`}
                    className="block border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-800/60"
                  >
                    <div className="font-medium truncate">{b.name}</div>
                    <div className="text-gray-400 dark:text-gray-500 text-xs truncate capitalize">
                      {b.category} · {b.adminEmail}
                    </div>
                    <div className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">
                      Applied {b.createdAt.toLocaleDateString()}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {pendingBrands.count > pendingBrandsList.length && (
            <Link
              href="/admin/brands"
              className="text-xs text-gray-500 dark:text-gray-400 hover:underline mt-2 inline-block"
            >
              View all {pendingBrands.count} →
            </Link>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Recent activity
          </h2>
          {recentLogs.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">No recent activity yet.</p>
          ) : (
            <ul className="space-y-2">
              {recentLogs.map((log) => {
                const colorClass =
                  ACTION_COLORS[log.action] ??
                  "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400";
                return (
                  <li
                    key={log.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${colorClass}`}>
                        {log.action}
                      </span>
                      <span className="text-gray-400 dark:text-gray-500 text-xs capitalize truncate">
                        {log.entityType}
                      </span>
                    </div>
                    <div className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                      {log.actorName ?? log.actorEmail ?? "System"} ·{" "}
                      {log.createdAt.toLocaleDateString()}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <Link
            href="/admin/audit"
            className="text-xs text-gray-500 dark:text-gray-400 hover:underline mt-2 inline-block"
          >
            View audit log →
          </Link>
        </section>
      </div>
    </div>
  );
}
