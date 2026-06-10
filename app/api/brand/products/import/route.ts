import { NextRequest, NextResponse } from "next/server";
import { requireBrandAdmin } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { audit, AuditAction } from "@/lib/audit";
import { assertBrandApproved } from "@/lib/db/queries/brand";
import { z } from "zod";

const VALID_CATEGORIES = ["casual", "business", "formal", "custom"] as const;
const VALID_TYPES = ["gift", "purchase"] as const;

const rowSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.enum(VALID_CATEGORIES),
  item_type: z.enum(VALID_TYPES),
  description: z.string().max(2000).optional().default(""),
  cost_price: z.coerce.number().int().nonnegative().optional(),
  price: z.coerce.number().int().nonnegative().optional(),
  return_policy: z.string().max(1000).optional().default(""),
});

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    return Object.fromEntries(headers.map((h, i) => [h, (values[i] ?? "").trim()]));
  });
}

export async function POST(request: NextRequest) {
  const { session, brandId } = await requireBrandAdmin();
  await assertBrandApproved(brandId);

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "CSV file required" }, { status: 400 });
  }
  // Accept text/csv and application/vnd.ms-excel (some OS/browser combos)
  const isCSV =
    file.type === "text/csv" ||
    file.type === "application/vnd.ms-excel" ||
    file.name.endsWith(".csv");
  if (!isCSV) {
    return NextResponse.json({ error: "File must be a CSV (.csv)" }, { status: 400 });
  }

  const text = await file.text();
  const rows = parseCSV(text);

  if (rows.length === 0) {
    return NextResponse.json({ error: "CSV is empty or malformed" }, { status: 400 });
  }

  if (rows.length > 500) {
    return NextResponse.json({ error: "Max 500 rows per import" }, { status: 400 });
  }

  type RowResult = { row: number; status: "imported" | "error"; name?: string; error?: string };
  const results: RowResult[] = [];
  let importedCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2;
    const parsed = rowSchema.safeParse(rows[i]);

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const msg = Object.entries(fieldErrors)
        .map(([k, v]) => `${k}: ${(v as string[]).join(", ")}`)
        .join("; ");
      results.push({ row: rowNum, status: "error", name: rows[i].name, error: msg || "Invalid row" });
      continue;
    }

    try {
      const d = parsed.data;
      await db.insert(products).values({
        brandId,
        name: d.name,
        category: d.category,
        itemType: d.item_type,
        description: d.description || null,
        costPrice: d.cost_price ?? null,
        price: d.price ?? null,
        returnPolicy: d.return_policy || null,
      });
      results.push({ row: rowNum, status: "imported", name: d.name });
      importedCount++;
    } catch {
      results.push({ row: rowNum, status: "error", name: rows[i].name, error: "Database error" });
    }
  }

  if (importedCount > 0) {
    await audit({
      actorId: session.user.id,
      action: AuditAction.PRODUCT_CREATED,
      entityType: "product",
      entityId: brandId,
      metadata: { count: importedCount, source: "csv_import" },
      ip: request.headers.get("x-forwarded-for") ?? undefined,
    });
  }

  const errorCount = results.filter((r) => r.status === "error").length;
  return NextResponse.json(
    { imported: importedCount, errors: errorCount, results },
    { status: 201 }
  );
}
