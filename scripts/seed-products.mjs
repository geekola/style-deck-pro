/**
 * Seed test products (with hero images) for a brand, for local discovery /
 * checkout / gifting testing. Uses placeholder image URLs (picsum.photos) so
 * NO Vercel Blob setup is required -- product_images.url is just a text
 * column, it doesn't need to be a real Blob URL for testing.
 *
 * Vercel Blob is only needed for the brand portal's "upload image" feature
 * (app/api/brand/products/images/route.ts). This script bypasses that.
 *
 * Usage:
 *   node scripts/seed-products.mjs [brandAdminEmail] [productSet]
 *
 * productSet selects which catalog to seed (see PRODUCT_SETS below):
 *   - "default"    (16 items, tailoring/eveningwear) -- default
 *   - "streetwear" (9 items, casual/athleisure) -- useful for seeding a
 *                  second brand so discovery/isolation testing has two
 *                  visually distinct catalogs
 *
 * Defaults to testbrandfive@example.com (approved, open access).
 * (DATABASE_URL is read from .env.local automatically)
 */

import postgres from "postgres";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env.local");

const env = {};
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
}

const adminEmail = process.argv[2] || "testbrandfive@example.com";
const productSetName = process.argv[3] || "default";
const sql = postgres(env.DATABASE_URL, { ssl: "require" });

const [brand] = await sql`
  select b.id, b.name, b.status, b.access_policy
  from brands b
  join brand_admins ba on ba.brand_id = b.id
  join users u on u.id = ba.user_id
  where u.email = ${adminEmail}
  limit 1
`;

if (!brand) {
  console.error(`No brand found for admin ${adminEmail}`);
  await sql.end();
  process.exit(1);
}

console.log(`Seeding products for ${brand.name} [${brand.status}, access: ${brand.access_policy}]`);

const PRODUCT_SETS = {
  // Tailoring / eveningwear catalog (original 8 + 8 more for variety).
  default: [
    {
      name: "Tailored Wool Blazer",
      category: "business",
      itemType: "purchase",
      description: "A structured single-breasted blazer in Italian wool, cut for a modern silhouette.",
      costPrice: 18000,
      price: 49500,
      seed: "blazer",
    },
    {
      name: "Silk Camp Shirt",
      category: "casual",
      itemType: "purchase",
      description: "Relaxed-fit camp collar shirt in 100% mulberry silk.",
      costPrice: 6500,
      price: 19500,
      seed: "campshirt",
    },
    {
      name: "Midnight Tuxedo Jacket",
      category: "formal",
      itemType: "purchase",
      description: "Satin-lapel tuxedo jacket in midnight navy, fully canvassed.",
      costPrice: 32000,
      price: 89000,
      seed: "tuxedo",
    },
    {
      name: "Cashmere Crewneck Sweater",
      category: "casual",
      itemType: "gift",
      description: "Lightweight cashmere crewneck in a heathered grey, perfect for layering.",
      costPrice: 9000,
      price: 24500,
      seed: "cashmere",
    },
    {
      name: "Pleated Wide-Leg Trousers",
      category: "business",
      itemType: "purchase",
      description: "High-waisted pleated trousers in a soft wool-blend twill.",
      costPrice: 8000,
      price: 21000,
      seed: "trousers",
    },
    {
      name: "Custom Made-to-Measure Suit",
      category: "custom",
      itemType: "purchase",
      description: "Two-piece suit, made to your exact measurements with a choice of fabrics.",
      costPrice: 45000,
      price: 125000,
      seed: "customsuit",
    },
    {
      name: "Leather Chelsea Boots",
      category: "casual",
      itemType: "purchase",
      description: "Hand-finished leather Chelsea boots with an elastic side panel.",
      costPrice: 14000,
      price: 38000,
      seed: "boots",
    },
    {
      name: "Evening Clutch",
      category: "formal",
      itemType: "gift",
      description: "Structured satin clutch with a hidden magnetic clasp.",
      costPrice: 4000,
      price: 12500,
      seed: "clutch",
    },
    {
      name: "Cotton Poplin Dress Shirt",
      category: "business",
      itemType: "purchase",
      description: "Crisp two-ply cotton poplin shirt with a spread collar, made for daily wear.",
      costPrice: 4500,
      price: 14500,
      seed: "dressshirt",
    },
    {
      name: "Merino Wool Overcoat",
      category: "formal",
      itemType: "purchase",
      description: "Double-breasted overcoat in heavyweight merino wool with a half-belt back.",
      costPrice: 28000,
      price: 79500,
      seed: "overcoat",
    },
    {
      name: "Quilted Bomber Jacket",
      category: "casual",
      itemType: "gift",
      description: "Lightweight quilted bomber with ribbed cuffs and a stand collar.",
      costPrice: 11000,
      price: 29500,
      seed: "bomber",
    },
    {
      name: "Pleated Midi Skirt",
      category: "business",
      itemType: "purchase",
      description: "Fluid pleated midi skirt in a satin-back crepe, falls just below the knee.",
      costPrice: 5500,
      price: 16500,
      seed: "midiskirt",
    },
    {
      name: "Velvet Dinner Jacket",
      category: "formal",
      itemType: "purchase",
      description: "Shawl-collar dinner jacket in deep emerald velvet, fully lined.",
      costPrice: 26000,
      price: 72000,
      seed: "velvetjacket",
    },
    {
      name: "Custom Tailored Shirt",
      category: "custom",
      itemType: "purchase",
      description: "Made-to-measure dress shirt, your choice of fabric, collar, and cuff style.",
      costPrice: 7000,
      price: 22000,
      seed: "customshirt",
    },
    {
      name: "Leather Crossbody Bag",
      category: "casual",
      itemType: "gift",
      description: "Compact grained-leather crossbody with an adjustable strap and brass hardware.",
      costPrice: 7500,
      price: 21500,
      seed: "crossbody",
    },
    {
      name: "Silk Pocket Square Set",
      category: "formal",
      itemType: "gift",
      description: "Set of three hand-rolled silk pocket squares in coordinating prints.",
      costPrice: 1800,
      price: 5500,
      seed: "pocketsquare",
    },
  ],

  // Casual / streetwear catalog for seeding a second brand, so discovery
  // and brand-isolation testing has two visually distinct catalogs.
  streetwear: [
    {
      name: "Oversized Graphic Hoodie",
      category: "casual",
      itemType: "purchase",
      description: "Heavyweight cotton fleece hoodie with a dropped shoulder and front graphic print.",
      costPrice: 3500,
      price: 9800,
      seed: "hoodie",
    },
    {
      name: "Performance Track Jacket",
      category: "casual",
      itemType: "purchase",
      description: "Zip-through track jacket in a brushed tech fabric with taped side seams.",
      costPrice: 4200,
      price: 11500,
      seed: "trackjacket",
    },
    {
      name: "Tapered Jogger Pants",
      category: "casual",
      itemType: "purchase",
      description: "Tapered fleece joggers with ribbed cuffs and a drawstring waist.",
      costPrice: 2800,
      price: 7800,
      seed: "joggers",
    },
    {
      name: "Structured Bomber",
      category: "casual",
      itemType: "gift",
      description: "Boxy nylon bomber jacket with a snap closure and contrast ribbing.",
      costPrice: 6000,
      price: 16500,
      seed: "streetbomber",
    },
    {
      name: "Canvas High-Top Sneakers",
      category: "casual",
      itemType: "purchase",
      description: "Classic canvas high-tops with a vulcanized rubber sole.",
      costPrice: 3200,
      price: 8500,
      seed: "sneakers",
    },
    {
      name: "Minimalist Tote Bag",
      category: "casual",
      itemType: "gift",
      description: "Heavy canvas tote with leather handles and an internal zip pocket.",
      costPrice: 1800,
      price: 4800,
      seed: "tote",
    },
    {
      name: "Wool Blend Overshirt",
      category: "business",
      itemType: "purchase",
      description: "Brushed wool-blend overshirt that layers as a light jacket.",
      costPrice: 6500,
      price: 17500,
      seed: "overshirt",
    },
    {
      name: "Pleated Trench Coat",
      category: "formal",
      itemType: "purchase",
      description: "Knee-length cotton trench with a storm flap and belted waist.",
      costPrice: 13000,
      price: 34500,
      seed: "trench",
    },
    {
      name: "Custom Embroidered Denim Jacket",
      category: "custom",
      itemType: "purchase",
      description: "Made-to-order denim jacket with custom embroidery placement and thread color.",
      costPrice: 5500,
      price: 16800,
      seed: "denimjacket",
    },
  ],
};

const PRODUCTS = PRODUCT_SETS[productSetName];

if (!PRODUCTS) {
  console.error(
    `Unknown product set "${productSetName}". Available sets: ${Object.keys(PRODUCT_SETS).join(", ")}`
  );
  await sql.end();
  process.exit(1);
}

for (const p of PRODUCTS) {
  const [product] = await sql`
    insert into products (brand_id, name, category, item_type, description, cost_price, price, active)
    values (${brand.id}, ${p.name}, ${p.category}, ${p.itemType}, ${p.description}, ${p.costPrice}, ${p.price}, true)
    returning id
  `;

  await sql`
    insert into product_images (product_id, url, hero, display_order)
    values (${product.id}, ${`https://picsum.photos/seed/${p.seed}/800/1000`}, true, 0)
  `;

  console.log(`  + ${p.name} (${p.category}/${p.itemType}) -> ${product.id}`);
}

console.log(`\nDone. Seeded ${PRODUCTS.length} products for ${brand.name}.`);
await sql.end();
