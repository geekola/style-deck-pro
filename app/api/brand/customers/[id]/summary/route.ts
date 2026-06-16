import { NextRequest, NextResponse } from "next/server";
import { requireBrandAdmin } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { customers, users, measurements, brands, brandAccess } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * GET /api/brand/customers/[id]/summary
 * Returns a printable HTML client profile summary.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { brandId } = await requireBrandAdmin();
  const { id } = await params;

  const [brand] = await db
    .select({ name: brands.name, accessPolicy: brands.accessPolicy })
    .from(brands)
    .where(eq(brands.id, brandId))
    .limit(1);

  if (!brand) return new NextResponse("Brand not found", { status: 404 });

  if (brand.accessPolicy !== "open") {
    const [access] = await db
      .select({ id: brandAccess.id })
      .from(brandAccess)
      .where(and(eq(brandAccess.brandId, brandId), eq(brandAccess.customerId, id)))
      .limit(1);
    if (!access) return new NextResponse("Not found", { status: 404 });
  }

  const [row] = await db
    .select({
      id: customers.id,
      name: users.name,
      email: users.email,
      type: customers.type,
      industry: customers.industry,
      status: customers.status,
      createdAt: customers.createdAt,
    })
    .from(customers)
    .innerJoin(users, eq(customers.userId, users.id))
    .where(eq(customers.id, id))
    .limit(1);

  if (!row) return new NextResponse("Not found", { status: 404 });

  const [m] = await db
    .select()
    .from(measurements)
    .where(eq(measurements.customerId, id))
    .limit(1);

  const fmt = (v: string | null | undefined) => v ?? "--";
  const cap = (v: string) => v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, " ");

  const measureRows = m
    ? [
        ["Height", m.height],
        ["Weight", m.weight],
        ["Chest", m.chest],
        ["Waist", m.waist],
        ["Hips", m.hips],
        ["Neck", m.neck],
        ["Shoulder width", m.shoulderWidth],
        ["Sleeve length", m.sleeveLength],
        ["Inseam", m.inseam],
        ["Shoe size", m.shoeSize],
        ["Shoe width", m.shoeWidth],
        ...(m.extended ? Object.entries(m.extended) : []),
      ].filter(([, v]) => v)
    : [];

  const measureHtml = measureRows.length > 0
    ? `<table class="measure-table">
        <tbody>
          ${measureRows.map(([label, val]) => `<tr><td class="label">${label}</td><td>${fmt(val as string)}</td></tr>`).join("")}
        </tbody>
      </table>
      <p class="sub">Unit system: ${m!.unitSystem} &nbsp;·&nbsp; Gender: ${m!.gender} &nbsp;·&nbsp; Updated: ${new Date(m!.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>`
    : `<p class="sub">No measurements on file.</p>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Client Profile — ${row.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #1a1a1a; background: #fff; padding: 48px; font-size: 13px; line-height: 1.5;
    }
    .title-bar {
      text-align: center; border: 2px solid #1a1a1a; padding: 12px; margin-bottom: 24px;
    }
    .title-bar h1 { font-size: 20px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; }
    .title-bar p { font-size: 11px; color: #888; margin-top: 4px; }
    .section { border: 1px solid #1a1a1a; margin-bottom: 16px; }
    .section-header {
      background: #f3f3f3; padding: 6px 12px;
      font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #888;
      border-bottom: 1px solid #1a1a1a;
    }
    .section-body { padding: 12px 14px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; }
    .info-item .label { font-size: 9px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #888; margin-bottom: 2px; }
    .info-item .value { font-size: 13px; font-weight: 600; text-transform: capitalize; }
    .measure-table { width: 100%; border-collapse: collapse; }
    .measure-table td { padding: 5px 0; border-bottom: 1px solid #eee; font-size: 13px; }
    .measure-table td.label { color: #888; width: 140px; }
    .sub { font-size: 11px; color: #aaa; margin-top: 8px; }
    .footer {
      margin-top: 24px; padding-top: 14px; border-top: 1px solid #eee;
      display: flex; justify-content: space-between; font-size: 10px; color: #bbb;
    }
    @media print { body { padding: 24px; } }
  </style>
</head>
<body>
  <div class="title-bar">
    <h1>Client Profile</h1>
    <p>${brand.name}</p>
  </div>

  <div class="section">
    <div class="section-header">Identity</div>
    <div class="section-body">
      <p style="font-size:16px;font-weight:700;margin-bottom:4px;">${row.name}</p>
      <p style="color:#555;margin-bottom:12px;">${row.email}</p>
      <div class="info-grid">
        <div class="info-item">
          <div class="label">Client type</div>
          <div class="value">${cap(row.type)}</div>
        </div>
        <div class="info-item">
          <div class="label">Industry</div>
          <div class="value">${cap(row.industry)}</div>
        </div>
        <div class="info-item">
          <div class="label">Status</div>
          <div class="value">${cap(row.status)}</div>
        </div>
        <div class="info-item">
          <div class="label">Member since</div>
          <div class="value">${new Date(row.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
        </div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-header">Measurements</div>
    <div class="section-body">
      ${measureHtml}
    </div>
  </div>

  <div class="footer">
    <span>Generated by StyleDeck &middot; ${new Date().toLocaleDateString()}</span>
    <span>Client ID: ${row.id}</span>
  </div>

  <script>
    window.addEventListener("load", () => setTimeout(() => window.print(), 400));
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
