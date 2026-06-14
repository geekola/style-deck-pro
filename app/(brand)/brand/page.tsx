import Link from "next/link";
import { requireBrandAdminPage } from "@/lib/auth-session";
import {
  getBrandProducts,
  getBrandOrders,
  getBrandById,
  getBrandPendingOrders,
  getBrandRecentSaves,
  getBrandRecentAccessGrants,
} from "@/lib/db/queries/brand";
import { DashboardShipButton } from "./dashboard-ship-button";

const ACTIVITY_LIMIT = 6;

export default async function BrandDashboardPage() {
  const { brandId } = await requireBrandAdminPage();
  const [brand, products, orders, pendingOrders, recentSaves, recentAccess] =
    await Promise.all([
      getBrandById(brandId),
      getBrandProducts(brandId),
      getBrandOrders(brandId),
      getBrandPendingOrders(brandId, 5),
      getBrandRecentSaves(brandId, ACTIVITY_LIMIT),
      getBrandRecentAccessGrants(brandId, ACTIVITY_LIMIT),
    ]);

  const activeProducts = products.filter((p) => p.active).length;
  const pendingOrdersCount = orders.filter((o) => o.status === "pending").length;

  type ActivityItem =
    | { type: "save"; id: string; productId: string; productName: string; customerName: string; at: Date }
    | { type: "access"; id: string; customerName: string; at: Date };

  const activity: ActivityItem[] = [
    ...recentSaves.map((s) => ({
      type: "save" as const,
      id: s.id,
      productId: s.productId,
      productName: s.productName,
      customerName: s.customerName,
      at: s.at,
    })),
    ...recentAccess.map((a) => ({
      type: "access" as const,
      id: a.id,
      customerName: a.customerName,
      at: a.at,
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, ACTIVITY_LIMIT);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-2">{brand?.name}</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 capitalize mb-10">
        {brand?.category} · {brand?.accessPolicy?.replace("_", " ")} access
      </p>

      <div className="grid grid-cols-3 gap-4 mb-10">
        <Stat label="Active products" value={activeProducts} href="/brand/products" />
        <Stat label="Total products" value={products.length} href="/brand/products" />
        <Stat label="Pending orders" value={pendingOrdersCount} href="/brand/orders" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <section>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Needs shipping
          </h2>
          {pendingOrders.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">Nothing to ship right now.</p>
          ) : (
            <ul className="space-y-2">
              {pendingOrders.map((o) => (
                <li
                  key={o.id}
                  className="flex items-center justify-between gap-3 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 text-sm"
                >
                  <Link href={`/brand/products/${o.productId}`} className="min-w-0 hover:underline">
                    <div className="font-medium truncate">{o.productName}</div>
                    <div className="text-gray-400 dark:text-gray-500 text-xs truncate">
                      {o.customerName} ·{" "}
                      {o.orderType === "gift" ? "Gift" : `$${(o.amountCents / 100).toFixed(2)}`}
                    </div>
                  </Link>
                  <DashboardShipButton orderId={o.id} />
                </li>
              ))}
            </ul>
          )}
          {pendingOrdersCount > pendingOrders.length && (
            <Link
              href="/brand/orders"
              className="text-xs text-gray-500 dark:text-gray-400 hover:underline mt-2 inline-block"
            >
              View all {pendingOrdersCount} →
            </Link>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Recent activity
          </h2>
          {activity.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">No recent activity yet.</p>
          ) : (
            <ul className="space-y-2">
              {activity.map((item) =>
                item.type === "save" ? (
                  <li key={`save-${item.id}`}>
                    <Link
                      href={`/brand/products/${item.productId}`}
                      className="block border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-800/60"
                    >
                      <span>
                        <span className="font-medium">{item.customerName}</span> saved{" "}
                        <span className="font-medium">{item.productName}</span>
                      </span>
                      <div className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">
                        {item.at.toLocaleDateString()}
                      </div>
                    </Link>
                  </li>
                ) : (
                  <li
                    key={`access-${item.id}`}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 text-sm"
                  >
                    <span>
                      <span className="font-medium">{item.customerName}</span> was granted access
                    </span>
                    <div className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">
                      {item.at.toLocaleDateString()}
                    </div>
                  </li>
                )
              )}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors block"
    >
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</div>
    </Link>
  );
}
