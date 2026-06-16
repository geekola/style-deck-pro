/**
 * Migration: add address + return_address (JSONB) to brands table.
 * Safe to re-run — checks information_schema before altering.
 *
 * Usage:
 *   node scripts/run-brand-address-migration.mjs
 */

import postgres from "postgres";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../.env.local");

function loadEnv(filePath) {
  try {
    const lines = fs.readFileSync(filePath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // no .env.local — rely on environment
  }
}

loadEnv(envPath);

const sql = postgres(process.env.DATABASE_URL);

try {
  const existing = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'brands'
      AND column_name IN ('address', 'return_address')
  `;
  const done = new Set(existing.map((r) => r.column_name));

  if (!done.has("address")) {
    await sql`ALTER TABLE brands ADD COLUMN address JSONB`;
    console.log("✓ Added address column to brands.");
  } else {
    console.log("✓ address already exists — skipping.");
  }

  if (!done.has("return_address")) {
    await sql`ALTER TABLE brands ADD COLUMN return_address JSONB`;
    console.log("✓ Added return_address column to brands.");
  } else {
    console.log("✓ return_address already exists — skipping.");
  }

  console.log("Migration complete.");
} finally {
  await sql.end();
}
