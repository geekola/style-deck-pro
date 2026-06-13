-- Creates a singleton platform_settings table (id always 1) holding
-- platform-wide branding, starting with the platform logo shown in
-- DashboardNav across the admin, brand, and customer portals.
-- Safe to run in a single execution.

CREATE TABLE IF NOT EXISTS "platform_settings" (
  "id" integer PRIMARY KEY DEFAULT 1,
  "logo_url" text,
  "updated_at" timestamp NOT NULL DEFAULT now()
);

INSERT INTO "platform_settings" ("id") VALUES (1) ON CONFLICT ("id") DO NOTHING;
