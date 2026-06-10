import { NextRequest, NextResponse } from "next/server";
import { requireBrandAdmin } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { orders, products, customers, users, brands } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * GET /api/brand/orders/[id]/invoice
 *
 * Returns a printable HTML invoice for a brand order.
 * Opens in a new tab; browser print dialog handles PDF export.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { brandId } = await requireBrandAdmin();
  const { id } = await params;

  const [row] = await db
    .select({
      orderId: orders.id,
      orderType: orders.orderType,
      status: orders.status,
      amountCents: orders.amountCents,
      trackingNumber: orders.trackingNumber,
      shippingAddress: orders.shippingAddress,
      createdAt: orders.createdAt,
      shippedAt: orders.shippedAt,
      productName: products.name,
      productCategory: products.category,
      brandName: brands.name,
      brandEmail: brands.fulfillmentEmail,
      customerName: users.name,
      customerEmail: users.email,
    })
    .from(orders)
    .innerJoin(products, eq(orders.productId, products.id))
    .innerJoin(brands, eq(orders.brandId, brands.id))
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .innerJoin(users, eq(customers.userId, users.id))
    .where(and(eq(orders.id, id), eq(orders.brandId, brandId)))
    .limit(1);

  if (!row) {
    return new NextResponse("Order not found", { status: 404 });
  }

  const addr = row.shippingAddress;
  const addrHtml = addr
    ? `${addr.line1}${addr.line2 ? ", " + addr.line2 : ""}<br>${addr.city}, ${addr.state} ${addr.postalCode}<br>${addr.country}`
    : "—";

  const date = new Date(row.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const amount =
    row.orderType === "gift"
      ? "Gift (complimentary)"
      : `$${(row.amountCents / 100).toFixed(2)}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice — ${row.orderId.slice(0, 8).toUpperCase()}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #1a1a1a;
      background: #fff;
      padding: 48px;
      font-size: 14px;
      line-height: 1.6;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 24px;
      border-bottom: 2px solid #1a1a1a;
      margin-bottom: 36px;
    }
    .brand-name {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .invoice-label {
      font-size: 11px;
      color: #888;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      margin-top: 4px;
    }
    .meta { text-align: right; }
    .meta .invoice-num {
      font-size: 18px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
    .meta .date { font-size: 13px; color: #666; margin-top: 4px; }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-bottom: 36px;
    }
    .section-label {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #888;
      margin-bottom: 8px;
    }
    .section-value { color: #1a1a1a; }
    .section-value strong { font-weight: 600; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 36px;
    }
    thead tr {
      border-bottom: 1.5px solid #1a1a1a;
    }
    th {
      text-align: left;
      padding: 8px 0 10px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #888;
    }
    th:last-child, td:last-child { text-align: right; }
    td {
      padding: 14px 0;
      border-bottom: 1px solid #eee;
      vertical-align: top;
    }
    .td-product { font-weight: 500; }
    .td-type {
      font-size: 11px;
      color: #888;
      text-transform: capitalize;
      margin-top: 2px;
    }
    .total-row {
      display: flex;
      justify-content: flex-end;
      gap: 48px;
      padding: 16px 0;
      border-top: 2px solid #1a1a1a;
      font-weight: 600;
      font-size: 16px;
    }
    .status-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      background: ${row.status === "shipped" ? "#dcfce7" : "#f3f4f6"};
      color: ${row.status === "shipped" ? "#166534" : "#374151"};
      text-transform: capitalize;
    }
    .footer {
      margin-top: 48px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #bbb;
    }
    @media print {
      body { padding: 24px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand-name">${row.brandName}</div>
      <div class="invoice-label">StyleDeck Fulfillment Invoice</div>
    </div>
    <div class="meta">
      <div class="invoice-num">#${row.orderId.slice(0, 8).toUpperCase()}</div>
      <div class="date">${date}</div>
      <div style="margin-top:8px"><span class="status-badge">${row.status}</span></div>
    </div>
  </div>

  <div class="grid">
    <div>
      <div class="section-label">Ship to</div>
      <div class="section-value">
        <strong>${row.customerName}</strong><br>
        ${addrHtml}
      </div>
    </div>
    <div>
      <div class="section-label">Order details</div>
      <div class="section-value">
        <div>Type: <strong>${row.orderType === "gift" ? "Gift" : "Purchase"}</strong></div>
        ${row.trackingNumber ? `<div style="margin-top:4px">Tracking: <strong>${row.trackingNumber}</strong></div>` : ""}
        ${row.shippedAt ? `<div style="margin-top:4px">Shipped: <strong>${new Date(row.shippedAt).toLocaleDateString()}</strong></div>` : ""}
      </div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th>Category</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          <div class="td-product">${row.productName}</div>
          <div class="td-type">${row.orderType}</div>
        </td>
        <td style="color:#888;text-transform:capitalize">${row.productCategory}</td>
        <td>${amount}</td>
      </tr>
    </tbody>
  </table>

  <div class="total-row">
    <span>Total</span>
    <span>${amount}</span>
  </div>

  <div class="footer">
    <span>Generated by StyleDeck · ${new Date().toLocaleDateString()}</span>
    <span>Order ID: ${row.orderId}</span>
  </div>

  <script>
    // Auto-open print dialog when loaded in a new tab
    window.addEventListener('load', () => setTimeout(() => window.print(), 400));
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
