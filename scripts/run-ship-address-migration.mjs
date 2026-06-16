/**
 * Migration: add ship_to_address (JSONB) to users table.
 * Safe to re-run — checks information_schema before altering.
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const { Client } = pg;

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");

function loadEnv(path) {
  try {
    const lines = readFileSync(path, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      process.env[key] = process.env[key] ?? val;
    }
  } catch {
    // no .env.local — rely on environment
  }
}

loadEnv(envPath);

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  // Check if column already exists
  const { rows } = await client.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'ship_to_address'
  `);

  if (rows.length > 0) {
    console.log("✓ ship_to_address already exists on users — nothing to do.");
  } else {
    await client.query(`
      ALTER TABLE users ADD COLUMN ship_to_address JSONB
    `);
    console.log("✓ Added ship_to_address column to users.");
  }

  console.log("Migration complete.");
} finally {
  await client.end();
}
