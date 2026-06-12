import { NextRequest, NextResponse } from "next/server";
import { requireBrandAdmin } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { orders, products, customers, users, brands } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * GET /api/brand/orders/[id]/invoice
 *
 * Returns a printable HTML packing list for a brand order.
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
      productId: products.id,
      productName: products.name,
      productCategory: products.category,
      brandName: brands.name,
      brandEmail: brands.fulfillmentEmail,
      customerId: customers.id,
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
    : "No shipping address on file";

  const orderDate = new Date(row.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const shipDate = row.shippedAt
    ? new Date(row.shippedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "--";

  const amount =
    row.orderType === "gift"
      ? "Gift (complimentary)"
      : `$${(row.amountCents / 100).toFixed(2)}`;

  const qtyShipped = row.status === "shipped" ? "1" : "0";
  const isComplete = row.status === "shipped";
  const isPartial = false; // single-item orders are always all-or-nothing in MVP

  const checkbox = (checked: boolean) =>
    checked
      ? `<span class="checkbox checked">&#10003;</span>`
      : `<span class="checkbox"></span>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Packing List -- ${row.orderId.slice(0, 8).toUpperCase()}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #1a1a1a;
      background: #fff;
      padding: 48px;
      font-size: 13px;
      line-height: 1.5;
    }
    .title-bar {
      text-align: center;
      border: 2px solid #1a1a1a;
      padding: 12px;
      margin-bottom: 24px;
    }
    .title-bar h1 {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 0.2em;
      text-transform: uppercase;
    }
    .panels {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }
    .panel {
      border: 1px solid #1a1a1a;
      padding: 12px 14px;
      min-height: 90px;
    }
    .panel-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #888;
      margin-bottom: 6px;
    }
    .panel-body { font-size: 13px; }
    .panel-body strong { font-weight: 600; }
    .order-info {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      border: 1px solid #1a1a1a;
      margin-bottom: 16px;
    }
    .order-info > div {
      padding: 8px 10px;
      border-right: 1px solid #1a1a1a;
    }
    .order-info > div:last-child { border-right: none; }
    .order-info .label {
      display: block;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #888;
      margin-bottom: 4px;
    }
    .order-info .value {
      display: block;
      font-size: 13px;
      font-weight: 600;
    }
    table.items {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #1a1a1a;
      margin-bottom: 16px;
    }
    table.items th {
      text-align: left;
      padding: 8px 10px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      background: #f3f3f3;
      border-bottom: 1px solid #1a1a1a;
      border-right: 1px solid #ddd;
    }
    table.items th:last-child, table.items td:last-child { border-right: none; }
    table.items td {
      padding: 12px 10px;
      border-right: 1px solid #ddd;
      border-bottom: 1px solid #ddd;
      vertical-align: top;
    }
    table.items td.center, table.items th.center { text-align: center; }
    .item-sub {
      font-size: 11px;
      color: #888;
      text-transform: capitalize;
      margin-top: 2px;
    }
    .total-row {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 24px;
      padding: 10px 14px;
      border: 1px solid #1a1a1a;
      border-top: none;
      font-weight: 700;
      font-size: 14px;
      margin-top: -16px;
      margin-bottom: 16px;
    }
    .notes {
      border: 1px solid #1a1a1a;
      padding: 10px 14px;
      min-height: 70px;
      margin-bottom: 16px;
    }
    .notes-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #888;
      margin-bottom: 6px;
    }
    .checks {
      display: flex;
      gap: 32px;
      margin-bottom: 24px;
    }
    .checks label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      font-weight: 600;
    }
    .checkbox {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      border: 1.5px solid #1a1a1a;
      font-size: 12px;
      line-height: 1;
    }
    .checkbox.checked { background: #1a1a1a; color: #fff; }
    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 600;
      background: ${row.status === "shipped" ? "#dcfce7" : "#f3f4f6"};
      color: ${row.status === "shipped" ? "#166534" : "#374151"};
      text-transform: capitalize;
    }
    .footer {
      margin-top: 24px;
      padding-top: 14px;
      border-top: 1px solid #eee;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #bbb;
    }
    @media print {
      body { padding: 24px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="title-bar">
    <h1>Packing List</h1>
  </div>

  <div class="panels">
    <div class="panel">
      <div class="panel-label">Company</div>
      <div class="panel-body">
        <strong>${row.brandName}</strong><br>
        ${row.brandEmail}
      </div>
    </div>
    <div class="panel">
      <div class="panel-label">Customer</div>
      <div class="panel-body">
        <strong>${row.customerName}</strong><br>
        ${row.customerEmail}<br>
        ${addrHtml}
      </div>
    </div>
  </div>

  <div class="order-info">
    <div>
      <span class="label">Order Date</span>
      <span class="value">${orderDate}</span>
    </div>
    <div>
      <span class="label">Ship Date</span>
      <span class="value">${shipDate}</span>
    </div>
    <div>
      <span class="label">Order Type</span>
      <span class="value">${row.orderType === "gift" ? "Gift" : "Purchase"}</span>
    </div>
    <div>
      <span class="label">Order Number</span>
      <span class="value">#${row.orderId.slice(0, 8).toUpperCase()}</span>
    </div>
    <div>
      <span class="label">Customer Number</span>
      <span class="value">#${row.customerId.slice(0, 8).toUpperCase()}</span>
    </div>
  </div>

  <table class="items">
    <thead>
      <tr>
        <th class="center">#</th>
        <th>SKU / ID#</th>
        <th>Item Description</th>
        <th>Size</th>
        <th class="center">Qty. Ordered</th>
        <th class="center">Qty. Shipped</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="center">1</td>
        <td>${row.productId.slice(0, 8).toUpperCase()}</td>
        <td>
          ${row.productName}
          <div class="item-sub">${row.productCategory}</div>
        </td>
        <td>--</td>
        <td class="center">1</td>
        <td class="center">${qtyShipped}</td>
      </tr>
    </tbody>
  </table>

  <div class="total-row">
    <span>Total</span>
    <span>${amount}</span>
  </div>

  <div class="notes">
    <div class="notes-label">Notes</div>
    <div>
      ${row.trackingNumber ? `Tracking number: <strong>${row.trackingNumber}</strong><br>` : ""}
      Status: <span class="status-badge">${row.status}</span>
    </div>
  </div>

  <div class="checks">
    <label>${checkbox(isPartial)} Partial Order</label>
    <label>${checkbox(isComplete)} Complete Order</label>
  </div>

  <div class="footer">
    <span>Generated by StyleDeck &middot; ${new Date().toLocaleDateString()}</span>
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
