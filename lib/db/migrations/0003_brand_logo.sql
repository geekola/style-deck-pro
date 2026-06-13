-- Adds a logo_url column to brands for the brand's own logo, used in the
-- brand account "Branding" section and as a small overlay badge on the
-- brand's product images in the customer discover/saved views.
-- Safe to run in a single execution.

ALTER TABLE "brands" ADD COLUMN "logo_url" text;
