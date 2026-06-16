-- Add period_days to gifting_allowances to track the duration for rolling periods (30, 60, 90 days).
-- NULL means legacy/unspecified (treated as rolling with no set duration).
ALTER TABLE gifting_allowances ADD COLUMN IF NOT EXISTS period_days integer;
