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
  const searchParams = useSearchParams();
  const justPaid = searchParams.get("success") === "1";
  const justGifted = searchParams.get("gifted") === "1";

  useEffect(() => {
    fetch("/api/customer/orders")
      .then((r) => r.json())
      .then((data) => { setOrders(data); setLoading(false); });
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 max-w-lg mx-auto">
      <nav className="sticky top-0 z-20 bg-white dark:bg-gray-950 border-b border-black/6 dark:border-white/10 px-5 py-3.5 flex items-center justify-between">
        <Link href="/app/discover" className="text-sm text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white dark:text-white">← Discover</Link>
        <span className="text-xl font-semibold tracking-tight">Orders</span>
        <span className="w-12" />
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
          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="border border-black/8 rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm">{order.productName}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{order.brandName}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    order.status === "shipped"
                      ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 dark:text-gray-500"
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
                  <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-2">
                    Tracking: <span className="font-medium text-gray-700 dark:text-gray-300 dark:text-gray-600">{order.trackingNumber}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense>
      <OrdersInner />
    </Suspense>
  );
}
