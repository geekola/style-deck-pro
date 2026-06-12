-- Step 2 of 2: run AFTER 0001a has completed in its own execution/transaction.
-- Remaps rows using removed values to 'performer', then rebuilds the enum
-- with only the final values (actor, athlete, influencer, performer).

-- Remap rows using values that are being removed
UPDATE "customers" SET "type" = 'performer' WHERE "type" IN ('celebrity', 'executive', 'creator', 'other');

-- Build the final enum type with only the new values
CREATE TYPE "customer_type_new" AS ENUM ('actor', 'athlete', 'influencer', 'performer');

-- Swap the column over to the new type
ALTER TABLE "customers" ALTER COLUMN "type" TYPE "customer_type_new" USING "type"::text::"customer_type_new";

-- Drop the old type and rename the new one into place
DROP TYPE "customer_type";
ALTER TYPE "customer_type_new" RENAME TO "customer_type";
