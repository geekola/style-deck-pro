import { requireBrandAdminPage } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { orders, products, customers, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { ShipOrderButton } from "./ship-order-button";

export default async function BrandOrdersPage() {
  const { brandId } = await requireBrandAdminPage();

  const rows = await db
    .select({
      id: orders.id,
      orderType: orders.orderType,
      status: orders.status,
      amountCents: orders.amountCents,
      trackingNumber: orders.trackingNumber,
      shippingAddress: orders.shippingAddress,
      createdAt: orders.createdAt,
      shippedAt: orders.shippedAt,
      productName: products.name,
      customerName: users.name,
      customerEmail: users.email,
    })
    .from(orders)
    .innerJoin(products, eq(orders.productId, products.id))
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .innerJoin(users, eq(customers.userId, users.id))
    .where(eq(orders.brandId, brandId))
    .orderBy(desc(orders.createdAt));

  const pending = rows.filter((r) => r.status === "pending");
  const shipped = rows.filter((r) => r.status === "shipped");

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-8">Orders</h1>

      {rows.length === 0 ? (
        <div className="text-center py-20 text-gray-400 dark:text-gray-500">No orders yet.</div>
      ) : (
        <>
          {pending.length > 0 && (
            <section className="mb-10">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">
                Needs shipping ({pending.length})
              </h2>
              <div className="space-y-3">
                {pending.map((o) => (
                  <OrderCard key={o.id} order={o} />
                ))}
              </div>
            </section>
          )}

          {shipped.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">
                Shipped ({shipped.length})
              </h2>
              <div className="space-y-3">
                {shipped.map((o) => (
                  <OrderCard key={o.id} order={o} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

type OrderRow = {
  id: string;
  orderType: "purchase" | "gift";
  status: "pending" | "shipped";
  amountCents: number;
  trackingNumber: string | null;
  shippingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  } | null;
  createdAt: Date;
  shippedAt: Date | null;
  productName: string;
  customerName: string;
  customerEmail: string;
};

function OrderCard({ order: o }: { order: OrderRow }) {
  const addr = o.shippingAddress;
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium">{o.productName}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                o.orderType === "gift"
                  ? "bg-purple-100 text-purple-700"
                  : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
              }`}
            >
              {o.orderType === "gift" ? "Gift" : `Purchase · $${(o.amountCents / 100).toFixed(2)}`}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                o.status === "shipped"
                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {o.status === "shipped" ? "Shipped" : "Pending"}
            </span>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">
            {o.customerName} · <span className="text-gray-400 dark:text-gray-500">{o.customerEmail}</span>
          </div>
          {addr && (
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
              {addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}, {addr.city}, {addr.state} {addr.postalCode}, {addr.country}
            </div>
          )}
          {o.trackingNumber && (
            <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">
              Tracking: <span className="font-medium text-gray-700 dark:text-gray-300 dark:text-gray-600">{o.trackingNumber}</span>
            </div>
          )}
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Ordered {new Date(o.createdAt).toLocaleDateString()}
            {o.shippedAt && ` · Shipped ${new Date(o.shippedAt).toLocaleDateString()}`}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href={`/api/brand/orders/${o.id}/invoice`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/60 dark:bg-gray-900"
          >
            Invoice ↗
          </a>
          {o.status === "pending" && <ShipOrderButton orderId={o.id} />}
        </div>
      </div>
    </div>
  );
}
