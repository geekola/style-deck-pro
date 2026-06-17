import Link from "next/link";
import { requirePlatformAdminPage } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { users, brands, customers, orders, swipeEvents, products, auditLogs } from "@/lib/db/schema";
import { eq, count, sql, desc, gte, and } from "drizzle-orm";

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const ACTION_LABELS: Record<string, string> = {
  "brand.registered": "Brand registered",
  "brand.approved": "Brand approved",
  "brand.rejected": "Brand rejected",
  "brand.suspended": "Brand suspended",
  "brand.reactivated": "Brand reactivated",
  "brand.updated": "Brand updated",
  "brand.deleted": "Brand deleted",
  "brand.admin_added": "Brand admin added",
  "brand.admin_removed": "Brand admin removed",
  "product.created": "Product created",
  "product.updated": "Product updated",
  "product.deleted": "Product deleted",
  "product.activated": "Product activated",
  "product.deactivated": "Product deactivated",
  "access.granted": "Client access granted",
  "access.revoked": "Client access revoked",
  "order.created": "Order placed",
  "order.shipped": "Order shipped",
};

export default async function AdminDashboardPage() {
  await requirePlatformAdminPage();

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    [{ totalUsers }],
    [{ approvedBrands }],
    [{ pendingBrands }],
    [{ activeGifts }],
    swipeRow,
    pendingBrandList,
    recentSignups,
    recentAudit,
  ] = await Promise.all([
    db.select({ totalUsers: count() }).from(users),
    db.select({ approvedBrands: count() }).from(brands).where(eq(brands.status, "approved")),
    db.select({ pendingBrands: count() }).from(brands).where(eq(brands.status, "pending")),
    db.select({ activeGifts: count() }).from(orders).where(
      and(eq(orders.orderType, "gift"), eq(orders.status, "pending"))
    ),
    db.select({
      total: count(),
      rights: sql<number>`count(*) filter (where ${swipeEvents.direction} = 'right')`,
    })
    .from(swipeEvents)
    .where(gte(swipeEvents.swipedAt, sevenDaysAgo)),
    // Pending brand applications
    db.select({ id: brands.id, name: brands.name, category: brands.category, createdAt: brands.createdAt })
      .from(brands)
      .where(eq(brands.status, "pending"))
      .orderBy(brands.createdAt)
      .limit(8),
    // Recent customer signups
    db.select({ id: customers.id, name: users.name, type: customers.type, industry: customers.industry, createdAt: customers.createdAt })
      .from(customers)
      .innerJoin(users, eq(customers.userId, users.id))
      .orderBy(desc(customers.createdAt))
      .limit(8),
    // Recent audit log
    db.select({ id: auditLogs.id, action: auditLogs.action, entityType: auditLogs.entityType, createdAt: auditLogs.createdAt })
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(10),
  ]);

  const totalSwipes7d = Number(swipeRow[0]?.total ?? 0);
  const rightSwipes7d = Number(swipeRow[0]?.rights ?? 0);
  const swipeRate7d = totalSwipes7d > 0 ? Math.round((rightSwipes7d / totalSwipes7d) * 100) : null;

  const kpis = [
    { label: "Total users", value: totalUsers, href: "/admin/users", alert: false },
    { label: "Approved brands", value: approvedBrands, href: "/admin/brands", alert: false },
    {
      label: "Pending approval",
      value: pendingBrands,
      href: "/admin/brands?status=pending",
      alert: Number(pendingBrands) > 0,
    },
    {
      label: "Active gifts in-flight",
      value: activeGifts,
      href: "/admin/brands",
      alert: false,
    },
    {
      label: "Swipes (7d)",
      value: totalSwipes7d,
      href: null,
      alert: false,
    },
    {
      label: "Save rate (7d)",
      value: swipeRate7d != null ? `${swipeRate7d}%` : "—",
      href: null,
      alert: false,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-8 text-gray-900 dark:text-white">Platform Admin</h1>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-10">
        {kpis.map((k) => {
          const inner = (
            <div
              className={`border rounded-xl p-4 transition-colors h-full ${
                k.alert
                  ? "border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700"
                  : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60"
              } ${k.href ? "cursor-pointer" : ""}`}
            >
              <div className={`text-2xl font-semibold ${k.alert ? "text-amber-700 dark:text-amber-400" : "text-gray-900 dark:text-white"}`}>
                {k.value}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-tight">{k.label}</div>
            </div>
          );
          return k.href ? (
            <Link key={k.label} href={k.href}>{inner}</Link>
          ) : (
            <div key={k.label}>{inner}</div>
          );
        })}
      </div>

      {/* Pending queues */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">

        {/* Brand Applications */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Brand Applications
            </h2>
            <Link href="/admin/brands" className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              View all →
            </Link>
          </div>
          {pendingBrandList.length === 0 ? (
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-6 text-center">
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">All clear</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">No pending applications</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {pendingBrandList.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/admin/brands/${b.id}`}
                    className="flex items-center justify-between gap-3 border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 rounded-xl px-4 py-3 hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{b.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{b.category} · {fmtDate(b.createdAt)}</p>
                    </div>
                    <span className="shrink-0 text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700 px-2 py-0.5 rounded-full">
                      Pending
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent Client Signups */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Recent Clients
            </h2>
            <Link href="/admin/clients" className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              View all →
            </Link>
          </div>
          {recentSignups.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">No clients yet.</p>
          ) : (
            <ul className="space-y-2">
              {recentSignups.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-3 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{c.type} · {c.industry}</p>
                  </div>
                  <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">{fmtDate(c.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Platform Health Feed */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">
          Platform Activity
        </h2>
        {recentAudit.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">No recent activity.</p>
        ) : (
          <ul className="space-y-0 divide-y divide-gray-100 dark:divide-gray-800">
            {recentAudit.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300 truncate">
                    {ACTION_LABELS[e.action] ?? e.action}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 capitalize shrink-0">
                    {e.entityType.replace("_", " ")}
                  </span>
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{fmtDate(e.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
