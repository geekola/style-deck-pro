"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type ShippingAddress = {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

type OrderDetail = {
  id: string;
  orderType: "purchase" | "gift";
  status: "pending" | "shipped";
  amountCents: number;
  trackingNumber: string | null;
  shippingAddress: ShippingAddress | null;
  createdAt: string;
  shippedAt: string | null;
  productId: string;
  productName: string;
  productCategory: string;
  brandName: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
};

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ship form state
  const [shipping, setShipping] = useState(false);
  const [tracking, setTracking] = useState("");
  const [shipError, setShipError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/brand/orders/${id}`)
      .then(async (res) => {
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return null;
        }
        if (!res.ok) throw new Error("Failed to load order");
        return res.json();
      })
      .then((data) => {
        if (cancelled || !data) return;
        setOrder(data);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load order.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  async function handleMarkShipped() {
    setShipping(true);
    setShipError(null);
    const res = await fetch(`/api/brand/orders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "shipped", trackingNumber: tracking || undefined }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setShipError(data.error ?? "Failed to mark as shipped.");
      setShipping(false);
      return;
    }

    setOrder((prev) => prev ? { ...prev, status: "shipped", trackingNumber: tracking || null, shippedAt: new Date().toISOString() } : prev);
    setShipping(false);
  }

  if (loading) {
    return <div className="max-w-3xl mx-auto px-6 py-10 text-sm text-gray-500 dark:text-gray-400">Loading...</div>;
  }

  if (notFound || !order) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-semibold mb-4">Order not found</h1>
        <Link href="/brand/orders" className="text-sm underline">Back to orders</Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <p className="text-sm text-red-600 mb-4">{error}</p>
        <Link href="/brand/orders" className="text-sm underline">Back to orders</Link>
      </div>
    );
  }

  const addr = order.shippingAddress;
  const orderNum = order.id.slice(0, 8).toUpperCase();

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-8">
        <Link
          href="/brand/orders"
          className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1 mb-3"
        >
          <span>&#8592;</span> Orders
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Order #{orderNum}</h1>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {new Date(order.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                order.status === "shipped"
                  ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {order.status === "shipped" ? "Shipped" : "Needs shipping"}
            </span>
            <a
              href={`/api/brand/orders/${id}/invoice`}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-gray-300 dark:border-gray-600 text-sm px-4 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/60 dark:bg-gray-900"
            >
              Print invoice
            </a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <Section title="Customer">
          <Field label="Name" value={order.customerName} />
          <Field label="Email" value={order.customerEmail} />
        </Section>

        <Section title="Product">
          <Field label="Name" value={order.productName} />
          <Field label="Category" value={order.productCategory} capitalize />
          <Field
            label="Type"
            value={
              order.orderType === "gift"
                ? "Gift"
                : `Purchase · $${(order.amountCents / 100).toFixed(2)}`
            }
          />
        </Section>
      </div>

      <Section title="Shipping" className="mb-8">
        {addr ? (
          <div className="text-sm text-gray-700 dark:text-gray-300">
            <p>{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}</p>
            <p>{addr.city}, {addr.state} {addr.postalCode}</p>
            <p>{addr.country}</p>
          </div>
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-500">No shipping address on file.</p>
        )}
        {order.trackingNumber && (
          <div className="mt-3">
            <Field label="Tracking number" value={order.trackingNumber} />
          </div>
        )}
        {order.shippedAt && (
          <div className="mt-1">
            <Field
              label="Shipped"
              value={new Date(order.shippedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            />
          </div>
        )}
      </Section>

      {order.status === "pending" && (
        <div className="border border-amber-200 dark:border-amber-800/50 rounded-lg p-5 bg-amber-50 dark:bg-amber-900/10 mb-8">
          <h2 className="text-sm font-medium text-amber-800 dark:text-amber-400 mb-3">Mark as shipped</h2>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              placeholder="Tracking number (optional)"
              onKeyDown={(e) => { if (e.key === "Enter") handleMarkShipped(); }}
              className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white w-64"
            />
            <button
              onClick={handleMarkShipped}
              disabled={shipping}
              className="bg-black dark:bg-white dark:text-black text-white text-sm px-4 py-1.5 rounded-md hover:bg-gray-800 disabled:opacity-50"
            >
              {shipping ? "Saving..." : "Confirm shipped"}
            </button>
          </div>
          {shipError && <p className="text-xs text-red-600 mt-2">{shipError}</p>}
        </div>
      )}

      <div className="text-xs text-gray-400 dark:text-gray-500 border-t border-gray-200 dark:border-gray-700 pt-4">
        Order ID: {order.id}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  capitalize,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-gray-400 dark:text-gray-500 shrink-0 w-24">{label}</span>
      <span className={`text-gray-800 dark:text-gray-200 ${capitalize ? "capitalize" : ""}`}>{value}</span>
    </div>
  );
}
