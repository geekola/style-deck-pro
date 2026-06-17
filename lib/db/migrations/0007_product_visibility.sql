-- 1. Create visibility enum
CREATE TYPE product_visibility AS ENUM ('draft', 'hidden', 'live');

-- 2. Add visibility column (default live so existing active products stay visible)
ALTER TABLE products ADD COLUMN visibility product_visibility NOT NULL DEFAULT 'live';

-- 3. Migrate: active=false → draft (active=true already → live via default)
UPDATE products SET visibility = 'draft' WHERE active = false;

-- 4. Gift settings columns
ALTER TABLE products ADD COLUMN IF NOT EXISTS giftable boolean NOT NULL DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS monthly_gift_limit integer;
ALTER TABLE products ADD COLUMN IF NOT EXISTS approval_required boolean NOT NULL DEFAULT false;

-- 5. Drop old active column and its index
DROP INDEX IF EXISTS products_active_idx;
ALTER TABLE products DROP COLUMN active;
