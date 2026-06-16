"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

type Order = {
  id: string;
  orderType: "purchase" | "gift";
  status: "pending" | "shipped";
  amountCents: number;
  trackingNumber: string | null;
  createdAt: string;
  shippedAt: string | null;
  productName: string;
  brandName: string;
};

function OrdersInner() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [brandFilter, setBrandFilter] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const justPaid = searchParams.get("success") === "1";
  const justGifted = searchParams.get("gifted") === "1";

  useEffect(() => {
    fetch("/api/customer/orders")
      .then((r) => r.json())
      .then((data) => { setOrders(data); setLoading(false); });
  }, []);

  const brands = Array.from(
    new Map(orders.map((o) => [o.brandName, o.brandName])).entries()
  ).map(([name]) => name);

  const filteredOrders = brandFilter
    ? orders.filter((o) => o.brandName === brandFilter)
    : orders;

  const printLabel = brandFilter ? `${brandFilter} — Order Summary` : "All Brands — Order Summary";
  const purchaseTotal = filteredOrders
    .filter((o) => o.orderType === "purchase")
    .reduce((sum, o) => sum + o.amountCents, 0);

  return (
    <>
      {/* Screen view */}
      <div className="min-h-screen bg-white dark:bg-gray-950 max-w-lg mx-auto print:hidden">
        <nav className="sticky top-0 z-20 bg-white dark:bg-gray-950 border-b border-black/6 dark:border-white/10 px-5 py-3.5 flex items-center justify-between">
          <Link href="/app/discover" className="text-sm text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white">← Discover</Link>
          <span className="text-xl font-semibold tracking-tight">Orders</span>
          <button
            onClick={() => window.print()}
            className="text-xs text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white"
          >
            Print
          </button>
        </nav>

        {(justPaid || justGifted) && (
          <div className="mx-5 mt-4 rounded-xl bg-green-50 border border-green-200 p-4 text-sm text-green-800 dark:text-green-400">
            {justPaid ? "✓ Payment confirmed! Your order has been placed." : "✓ Gift request confirmed! The brand will be in touch."}
          </div>
        )}

        <div className="px-5 py-6">
          {loading ? (
            <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-12">Loading…</p>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-3 text-gray-400 dark:text-gray-500">
              <span className="text-4xl">📦</span>
              <p className="text-sm">No orders yet</p>
            </div>
          ) : (
            <>
              {/* Brand filter */}
              {brands.length > 1 && (
                <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
                  <button
                    onClick={() => setBrandFilter(null)}
                    className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      brandFilter === null
                        ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white"
                        : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-400"
                    }`}
                  >
                    All brands
                  </button>
                  {brands.map((b) => (
                    <button
                      key={b}
                      onClick={() => setBrandFilter(brandFilter === b ? null : b)}
                      className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        brandFilter === b
                          ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white"
                          : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-400"
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-3">
                {filteredOrders.map((order) => (
                  <div key={order.id} className="border border-black/8 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-sm">{order.productName}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{order.brandName}</p>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        order.status === "shipped"
                          ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                      }`}>
                        {order.status === "shipped" ? "Shipped" : "Processing"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
                      <span className="capitalize">{order.orderType}</span>
                      <span>·</span>
                      <span>{order.orderType === "gift" ? "Gift" : `$${(order.amountCents / 100).toFixed(2)}`}</span>
                      <span>·</span>
                      <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                    </div>
                    {order.trackingNumber && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Tracking: <span className="font-medium text-gray-700 dark:text-gray-300">{order.trackingNumber}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Print-only view */}
      <div className="hidden print:block p-10 text-black font-sans">
        <div className="border-2 border-black text-center py-3 mb-6">
          <h1 className="text-xl font-bold uppercase tracking-[0.2em]">Order History</h1>
          <p className="text-sm mt-1">{printLabel}</p>
        </div>

        <div className="flex justify-between text-xs mb-6">
          <span>Printed: {new Date().toLocaleDateString()}</span>
          <span>{filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""}</span>
        </div>

        <table className="w-full border-collapse border border-black text-sm mb-6">
          <thead>
            <tr>
              <th className="border border-black bg-gray-100 px-3 py-2 text-left font-semibold">Date</th>
              <th className="border border-black bg-gray-100 px-3 py-2 text-left font-semibold">Product</th>
              <th className="border border-black bg-gray-100 px-3 py-2 text-left font-semibold">Brand</th>
              <th className="border border-black bg-gray-100 px-3 py-2 text-left font-semibold">Type</th>
              <th className="border border-black bg-gray-100 px-3 py-2 text-left font-semibold">Status</th>
              <th className="border border-black bg-gray-100 px-3 py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => (
              <tr key={order.id}>
                <td className="border border-black px-3 py-2 whitespace-nowrap">
                  {new Date(order.createdAt).toLocaleDateString()}
                </td>
                <td className="border border-black px-3 py-2">{order.productName}</td>
                <td className="border border-black px-3 py-2">{order.brandName}</td>
                <td className="border border-black px-3 py-2 capitalize">{order.orderType}</td>
                <td className="border border-black px-3 py-2 capitalize">{order.status}</td>
                <td className="border border-black px-3 py-2 text-right">
                  {order.orderType === "gift" ? "Gift" : `$${(order.amountCents / 100).toFixed(2)}`}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5} className="border border-black px-3 py-2 font-semibold text-right">
                Purchase total
              </td>
              <td className="border border-black px-3 py-2 font-semibold text-right">
                ${(purchaseTotal / 100).toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>

        <p className="text-[10px] text-gray-400 text-center mt-6">
          Generated by StyleDeck &middot; {new Date().toLocaleDateString()}
        </p>
      </div>
    </>
  );
}

export default function OrdersPage() {
  return (
    <Suspense>
      <OrdersInner />
    </Suspense>
  );
}
