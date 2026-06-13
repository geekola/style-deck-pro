import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  pgEnum,
  uuid,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// --- Enums -------------------------------------------------------------------

export const roleEnum = pgEnum("role", [
  "platform_admin",
  "brand_admin",
  "customer",
]);

export const customerTypeEnum = pgEnum("customer_type", [
  "actor",
  "athlete",
  "influencer",
  "performer",
]);

export const industryEnum = pgEnum("industry", [
  "film",
  "music",
  "sports",
  "fashion",
  "business",
  "media",
  "technology",
  "other",
]);

export const brandStatusEnum = pgEnum("brand_status", [
  "pending",
  "approved",
  "rejected",
  "suspended",
]);

export const accessPolicyEnum = pgEnum("access_policy", [
  "open",
  "selective",
  "invite_only",
]);

export const brandCategoryEnum = pgEnum("brand_category", [
  "casual",
  "business",
  "formal",
  "custom",
]);

export const productTypeEnum = pgEnum("product_type", ["gift", "purchase"]);

export const orderStatusEnum = pgEnum("order_status", ["pending", "shipped"]);

export const orderTypeEnum = pgEnum("order_type", ["purchase", "gift"]);

export const swipeDirectionEnum = pgEnum("swipe_direction", ["left", "right"]);

export const unitSystemEnum = pgEnum("unit_system", ["metric", "imperial"]);

export const inviteSourceEnum = pgEnum("invite_source", [
  "platform_admin",
  "brand",
]);

export const inviteStatusEnum = pgEnum("invite_status", [
  "pending",
  "accepted",
  "expired",
]);

export const periodTypeEnum = pgEnum("period_type", ["rolling", "calendar"]);

export const customerStatusEnum = pgEnum("customer_status", [
  "active",
  "suspended",
]);

// General-purpose account status (currently used to suspend brand_admin
// users' portal access without suspending the whole brand; customers use
// their own customerStatusEnum above since that also affects discovery).
export const userStatusEnum = pgEnum("user_status", ["active", "suspended"]);

// --- Auth tables (managed by Better Auth) -------------------------------------

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: roleEnum("role").notNull().default("customer"),
  // Account-level status. Used for brand_admin portal access (see
  // requireBrandAdmin/requireBrandAdminPage); platform_admin and customer
  // rows are expected to stay "active" (customers use customerStatusEnum).
  status: userStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// --- Invites -------------------------------------------------------------------

export const invites = pgTable(
  "invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    source: inviteSourceEnum("source").notNull(),
    brandId: uuid("brand_id").references(() => brands.id, {
      onDelete: "cascade",
    }),
    token: text("token").notNull().unique(),
    status: inviteStatusEnum("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("invites_email_idx").on(t.email)]
);

// --- Brands ----------------------------------------------------------------------

export const brands = pgTable("brands", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  category: brandCategoryEnum("category").notNull(),
  adminEmail: text("admin_email").notNull(),
  fulfillmentEmail: text("fulfillment_email").notNull(),
  status: brandStatusEnum("status").notNull().default("pending"),
  statusReason: text("status_reason"),
  accessPolicy: accessPolicyEnum("access_policy").notNull().default("open"),
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const brandAdmins = pgTable(
  "brand_admins",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("brand_admins_user_brand_idx").on(t.userId, t.brandId)]
);

// --- Customers -------------------------------------------------------------------

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  type: customerTypeEnum("type").notNull(),
  industry: industryEnum("industry").notNull(),
  status: customerStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const measurements = pgTable("measurements", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id")
    .notNull()
    .unique()
    .references(() => customers.id, { onDelete: "cascade" }),
  gender: text("gender").notNull().default("male"), // 'male' | 'female'
  unitSystem: unitSystemEnum("unit_system").notNull().default("imperial"),
  // All measurement values stored as text (numeric strings) so units stay user-entered
  // Core fields
  height: text("height"),
  weight: text("weight"),
  shoeSize: text("shoe_size"),
  shoeWidth: text("shoe_width"),
  chest: text("chest"),
  waist: text("waist"),
  hips: text("hips"),
  neck: text("neck"),
  shoulderWidth: text("shoulder_width"),
  sleeveLength: text("sleeve_length"),
  inseam: text("inseam"),
  // Extended fields stored in JSONB for flexibility
  // keys match prototype field keys: bicep, wrist, knee, calf, thigh, rise, etc.
  extended: jsonb("extended").$type<Record<string, string>>(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// --- Customer Contacts -----------------------------------------------------------
// Secondary contacts (assistant, agent, manager, etc.) for a customer. Visible to
// the customer and platform admins only -- never exposed to brands.

export const customerContacts = pgTable(
  "customer_contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    role: text("role"), // free text, e.g. "Assistant", "Agent", "Manager"
    email: text("email"),
    phone: text("phone"),
    addressLine1: text("address_line1"),
    addressLine2: text("address_line2"),
    city: text("city"),
    state: text("state"),
    postalCode: text("postal_code"),
    country: text("country"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("customer_contacts_customer_id_idx").on(t.customerId)]
);

// --- Products ------------------------------------------------------------------

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: brandCategoryEnum("category").notNull(),
    itemType: productTypeEnum("item_type").notNull(),
    description: text("description"),
    costPrice: integer("cost_price"), // cents -- never returned to customers
    price: integer("price"), // cents
    returnPolicy: text("return_policy"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("products_brand_id_idx").on(t.brandId),
    index("products_active_idx").on(t.active),
  ]
);

export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    hero: boolean("hero").notNull().default(false),
    displayOrder: integer("display_order").notNull().default(0),
  },
  (t) => [index("product_images_product_id_idx").on(t.productId)]
);

// --- Access & Gifting ------------------------------------------------------------

export const brandAccess = pgTable(
  "brand_access",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    grantedAt: timestamp("granted_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("brand_access_brand_customer_idx").on(t.brandId, t.customerId),
  ]
);

export const giftingAllowances = pgTable(
  "gifting_allowances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    periodType: periodTypeEnum("period_type").notNull(),
    amountCents: integer("amount_cents").notNull(),
    usedCents: integer("used_cents").notNull().default(0),
    periodStart: timestamp("period_start").notNull(),
    manualResetAt: timestamp("manual_reset_at"),
  },
  (t) => [
    uniqueIndex("gifting_allowances_brand_customer_idx").on(
      t.brandId,
      t.customerId
    ),
  ]
);

// --- Discovery ---------------------------------------------------------------------

export const swipeEvents = pgTable(
  "swipe_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    direction: swipeDirectionEnum("direction").notNull(),
    swipedAt: timestamp("swiped_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("swipe_events_customer_product_idx").on(
      t.customerId,
      t.productId
    ),
    index("swipe_events_customer_id_idx").on(t.customerId),
  ]
);

export const savedProducts = pgTable(
  "saved_products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    savedAt: timestamp("saved_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("saved_products_customer_product_idx").on(
      t.customerId,
      t.productId
    ),
    index("saved_products_customer_id_idx").on(t.customerId),
  ]
);

// --- Orders --------------------------------------------------------------------

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id),
    orderType: orderTypeEnum("order_type").notNull(),
    status: orderStatusEnum("status").notNull().default("pending"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    amountCents: integer("amount_cents").notNull(),
    trackingNumber: text("tracking_number"),
    shippingAddress: jsonb("shipping_address").$type<{
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    }>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    shippedAt: timestamp("shipped_at"),
  },
  (t) => [
    index("orders_customer_id_idx").on(t.customerId),
    index("orders_brand_id_idx").on(t.brandId),
    index("orders_status_idx").on(t.status),
  ]
);

// --- Audit Logs ------------------------------------------------------------------

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: text("actor_id").references(() => users.id),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    metadata: jsonb("metadata"),
    ip: text("ip"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("audit_logs_actor_id_idx").on(t.actorId),
    index("audit_logs_entity_idx").on(t.entityType, t.entityId),
    index("audit_logs_created_at_idx").on(t.createdAt),
  ]
);

// --- Platform Settings -----------------------------------------------------------
// Singleton row (id always 1) holding platform-wide branding/config. Created by
// migration 0004_platform_settings.sql.

export const platformSettings = pgTable("platform_settings", {
  id: integer("id").primaryKey().default(1),
  logoUrl: text("logo_url"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// --- Relations -----------------------------------------------------------------

export const usersRelations = relations(users, ({ one, many }) => ({
  customer: one(customers, {
    fields: [users.id],
    references: [customers.userId],
  }),
  brandAdmins: many(brandAdmins),
  sessions: many(sessions),
  accounts: many(accounts),
  auditLogs: many(auditLogs, { relationName: "actor" }),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  user: one(users, { fields: [customers.userId], references: [users.id] }),
  measurements: one(measurements, {
    fields: [customers.id],
    references: [measurements.customerId],
  }),
  brandAccess: many(brandAccess),
  giftingAllowances: many(giftingAllowances),
  swipeEvents: many(swipeEvents),
  savedProducts: many(savedProducts),
  orders: many(orders),
  contacts: many(customerContacts),
}));

export const customerContactsRelations = relations(customerContacts, ({ one }) => ({
  customer: one(customers, { fields: [customerContacts.customerId], references: [customers.id] }),
}));

export const brandsRelations = relations(brands, ({ many }) => ({
  brandAdmins: many(brandAdmins),
  products: many(products),
  brandAccess: many(brandAccess),
  giftingAllowances: many(giftingAllowances),
  orders: many(orders),
  invites: many(invites),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  brand: one(brands, { fields: [products.brandId], references: [brands.id] }),
  images: many(productImages),
  swipeEvents: many(swipeEvents),
  savedProducts: many(savedProducts),
  orders: many(orders),
}));
