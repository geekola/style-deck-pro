-- Step 1 of 2: temporarily add the new enum values so existing rows can be
-- remapped in a later step. Run this on its own (separate execution/transaction
-- from 0001b).
ALTER TYPE "customer_type" ADD VALUE IF NOT EXISTS 'performer';
ALTER TYPE "customer_type" ADD VALUE IF NOT EXISTS 'actor';
