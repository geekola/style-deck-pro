import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { users, brands, orders, customers } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";

export default async function AdminDashboardPage() {
  await requirePlatformAdmin();

  const [[totalUsers], [totalBrands], [pendingBrands], [totalOrders]] =
    await Promise.all([
      db.select({ count: count() }).from(users),
      db.select({ count: count() }).from(brands),
      db.select({ count: count() }).from(brands).where(eq(brands.status, "pending")),
      db.select({ count: count() }).from(orders),
    ]);

  const stats = [
    { label: "Total users", value: totalUsers.count },
    { label: "Approved brands", value: totalBrands.count },
    { label: "Pending approval", value: pendingBrands.count, alert: pendingBrands.count > 0 },
    { label: "Total orders", value: totalOrders.count },
  ];

  const nav = [
    { href: "/admin/brands", label: "Brands", description: "Review applications, manage access policies" },
    { href: "/admin/users", label: "Users", description: "View and manage customer accounts" },
    { href: "/admin/audit", label: "Audit Log", description: "Platform-wide activity log" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-8">Platform Admin</h1>

      <div className="grid grid-cols-4 gap-3 mb-10">
        {stats.map((s) => (
          <div
            key={s.label}
            className={`border rounded-lg p-4 ${s.alert ? "border-amber-300 bg-amber-50" : "border-gray-200"}`}
          >
            <div className={`text-2xl font-semibold ${s.alert ? "text-amber-700" : ""}`}>
              {s.value}
            </div>
            <div className="text-sm text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="border border-gray-200 rounded-lg p-5 hover:bg-gray-50 transition-colors"
          >
            <div className="font-medium mb-1">{item.label}</div>
            <div className="text-sm text-gray-500">{item.description}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
