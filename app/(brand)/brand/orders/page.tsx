import { requireBrandAdminPage } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { orders, products, customers, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { OrdersTable } from "./orders-table";

export default async function BrandOrdersPage() {
  const { brandId } = await requireBrandAdminPage();

  const allOrders = await db
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

  const rows = allOrders.map((o) => ({
    id: o.id,
    orderType: o.orderType,
    status: o.status,
    amountCents: o.amountCents,
    trackingNumber: o.trackingNumber,
    shippingAddress: o.shippingAddress,
    createdAt: o.createdAt.toISOString(),
    shippedAt: o.shippedAt ? o.shippedAt.toISOString() : null,
    productName: o.productName,
    customerName: o.customerName,
    customerEmail: o.customerEmail,
  }));

  const stats = {
    total: rows.length,
    pending: rows.filter((r) => r.status === "pending").length,
    shipped: rows.filter((r) => r.status === "shipped").length,
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-8">Orders</h1>

      {rows.length === 0 ? (
        <div className="text-center py-20 text-gray-400 dark:text-gray-500">No orders yet.</div>
      ) : (
        <OrdersTable rows={rows} stats={stats} />
      )}
    </div>
  );
}
