import Link from "next/link";
import { requireBrandAdminPage } from "@/lib/auth-session";
import {
  getBrandProducts,
  getBrandOrders,
  getBrandById,
  getBrandSwipeStats,
  getBrandProductPerformance,
  getBrandPendingGifts,
  getBrandGiftingConversions,
} from "@/lib/db/queries/brand";
import { DashboardShipButton } from "./dashboard-ship-button";

const ACCESS_POLICY_BADGE: Record<string, { label: string; class: string }> = {
  open: { label: "Open Access", class: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800" },
  selective: { label: "Selective Access", class: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800" },
  invite_only: { label: "Invite Only", class: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800" },
};

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtDaysAgo(d: Date) {
  const days = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

export default async function BrandDashboardPage() {
  const { brandId } = await requireBrandAdminPage();

  const [brand, catalogItems, orders, swipeStats, topProducts, pendingGifts, giftingConversions] =
    await Promise.all([
      getBrandById(brandId),
      getBrandProducts(brandId),
      getBrandOrders(brandId),
      getBrandSwipeStats(brandId),
      getBrandProductPerformance(brandId, 5),
      getBrandPendingGifts(brandId, 6),
      getBrandGiftingConversions(brandId),
    ]);

  const liveItems = catalogItems.filter((p) => p.visibility === "live").length;
  const pendingOrdersCount = orders.filter((o) => o.status === "pending").length;
  const pendingOrdersValue = orders
    .filter((o) => o.status === "pending")
    .reduce((sum, o) => sum + (o.amountCents ?? 0), 0);

  const accessBadge = ACCESS_POLICY_BADGE[brand?.accessPolicy ?? "open"] ?? ACCESS_POLICY_BADGE.open;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">{brand?.name}</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">{brand?.category}</span>
          <span className="text-gray-300 dark:text-gray-600">·</span>
          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${accessBadge.class}`}>
            {accessBadge.label}
          </span>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-10">
        <Link
          href="/brand/products"
          className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
        >
          <div className="text-2xl font-semibold text-gray-900 dark:text-white">{liveItems}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-tight">Live catalog items</div>
        </Link>
        <Link
          href="/brand/products"
          className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
        >
          <div className="text-2xl font-semibold text-gray-900 dark:text-white">{catalogItems.length}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-tight">Total catalog items</div>
        </Link>
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <div className="text-2xl font-semibold text-gray-900 dark:text-white">
            {swipeStats.rightSwipeRate != null ? `${swipeStats.rightSwipeRate}%` : "—"}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-tight">Right-swipe rate</div>
        </div>
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <div className="text-2xl font-semibold text-gray-900 dark:text-white">{giftingConversions}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-tight">Gifting conversions</div>
        </div>
        <Link
          href="/brand/orders"
          className={`border rounded-xl p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60 ${
            pendingOrdersCount > 0
              ? "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/10"
              : "border-gray-200 dark:border-gray-700"
          }`}
        >
          <div className={`text-2xl font-semibold ${pendingOrdersCount > 0 ? "text-amber-700 dark:text-amber-400" : "text-gray-900 dark:text-white"}`}>
            {pendingOrdersCount}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-tight">
            Pending orders
            {pendingOrdersValue > 0 && (
              <span className="block text-amber-600 dark:text-amber-500 font-medium mt-0.5">
                ${(pendingOrdersValue / 100).toFixed(0)} value
              </span>
            )}
          </div>
        </Link>
      </div>

      {/* Bottom panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* Product Performance */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Product Performance
            </h2>
            <Link href="/brand/products" className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              All items →
            </Link>
          </div>

          {topProducts.length === 0 ? (
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-8 text-center">
              <p className="text-sm text-gray-400 dark:text-gray-500">No swipe data yet.</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Performance appears once clients start discovering your catalog.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {topProducts.map((p, i) => (
                <li key={p.productId}>
                  <Link
                    href={`/brand/products/${p.productId}`}
                    className="flex items-center gap-3 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
                  >
                    {/* Rank */}
                    <span className="text-xs font-medium text-gray-400 w-4 shrink-0">{i + 1}</span>
                    {/* Thumbnail */}
                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0">
                      {p.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full" />
                      )}
                    </div>
                    {/* Name + bar */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.productName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${p.rightSwipeRate}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0 w-8 text-right">
                          {p.rightSwipeRate}%
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Gifting & Fulfillment */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Gifting & Fulfillment
            </h2>
            <Link href="/brand/orders" className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              All orders →
            </Link>
          </div>

          {pendingGifts.length === 0 ? (
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-8 text-center">
              <p className="text-sm text-gray-400 dark:text-gray-500">No pending gift requests.</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">New requests will appear here for your review.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {pendingGifts.map((g) => (
                <li key={g.id}>
                  <Link
                    href={`/brand/orders`}
                    className="flex items-center justify-between gap-3 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white">
                        <span className="font-medium">{g.customerName}</span>
                        <span className="text-gray-500 dark:text-gray-400"> · {g.productName}</span>
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        Gift request · {fmtDaysAgo(g.createdAt)}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700 px-2 py-0.5 rounded-full">
                      Pending
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

      </div>
    </div>
  );
}
