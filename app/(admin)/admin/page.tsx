import Link from "next/link";
import { requirePlatformAdminPage } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { users, brands } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";

export default async function AdminDashboardPage() {
  await requirePlatformAdminPage();

  const [
    [totalUsers],
    [totalBrands],
    [pendingBrands],
    [suspendedBrands],
    [suspendedUsers],
  ] = await Promise.all([
    db.select({ count: count() }).from(users),
    db.select({ count: count() }).from(brands).where(eq(brands.status, "approved")),
    db.select({ count: count() }).from(brands).where(eq(brands.status, "pending")),
    db.select({ count: count() }).from(brands).where(eq(brands.status, "suspended")),
    db.select({ count: count() }).from(users).where(eq(users.status, "suspended")),
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

  const nav = [
    { href: "/admin/brands", label: "Brands", description: "Review applications, manage access policies" },
    { href: "/admin/users", label: "Users", description: "View and manage customer accounts" },
    { href: "/admin/brand-admins", label: "Brand Admins", description: "View and manage all brand admin accounts" },
    { href: "/admin/audit", label: "Audit Log", description: "Platform-wide activity log" },
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-5 hover:bg-gray-50 dark:hover:bg-gray-800/60 dark:bg-gray-900 transition-colors"
          >
            <div className="font-medium mb-1">{item.label}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{item.description}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
