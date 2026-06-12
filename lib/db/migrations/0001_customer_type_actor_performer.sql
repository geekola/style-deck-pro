-- Replaces the customer_type enum:
--   Old: celebrity, athlete, influencer, executive, creator, other
--   New: actor, athlete, influencer, performer
--
-- Existing rows using a dropped value (celebrity, executive, creator, other)
-- are bulk-set to 'performer' as a safe default. Correct individual records
-- afterward in Admin > Users if needed.
--
-- Run against the Railway DB once, e.g.:
--   psql "$DATABASE_URL" -f lib/db/migrations/0001_customer_type_actor_performer.sql
--
-- After this runs, `npm run db:push` should see no further diff for this enum.

-- Step 1: temporarily add the new values so existing rows can be remapped
ALTER TYPE "customer_type" ADD VALUE IF NOT EXISTS 'performer';
ALTER TYPE "customer_type" ADD VALUE IF NOT EXISTS 'actor';

-- Step 2: remap rows using values that are being removed
UPDATE "customers" SET "type" = 'performer' WHERE "type" IN ('celebrity', 'executive', 'creator', 'other');

-- Step 3: build the final enum type with only the new values
CREATE TYPE "customer_type_new" AS ENUM ('actor', 'athlete', 'influencer', 'performer');

-- Step 4: swap the column over to the new type
ALTER TABLE "customers" ALTER COLUMN "type" TYPE "customer_type_new" USING "type"::text::"customer_type_new";

-- Step 5: drop the old type and rename the new one into place
DROP TYPE "customer_type";
ALTER TYPE "customer_type_new" RENAME TO "customer_type";
