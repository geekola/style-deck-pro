-- Adds the customer_contacts table: secondary contacts (assistant, agent,
-- manager, etc.) attached to a customer. Visible to the customer and platform
-- admins only -- never exposed to brands. Safe to run in a single execution.

CREATE TABLE "customer_contacts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "customer_id" uuid NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "role" text,
  "email" text,
  "phone" text,
  "address_line1" text,
  "address_line2" text,
  "city" text,
  "state" text,
  "postal_code" text,
  "country" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX "customer_contacts_customer_id_idx" ON "customer_contacts" ("customer_id");
