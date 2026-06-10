# CLAUDE.md

# StyleDeck

## Mission

StyleDeck is a private fashion discovery platform connecting curated fashion brands with selected customers through a premium, swipe-based experience. Customers discover products organically while brands manage visibility, gifting, and fulfillment behind the scenes.

---

## Roles

### Customer

* Register/Login (Email + Google)
* Manage measurement profile
* Discover and save products
* Purchase products
* Receive gifted products

### Brand Admin

* Manage products
* Control customer access
* Manage gifting allowances
* Fulfill orders
* Manage brand settings

### Platform Admin

* Approve/reject brands
* Manage users
* Manage restrictions
* Review platform activity

---

## Customer Model

### Customer Types

* Celebrity
* Athlete
* Influencer
* Executive
* Creator
* Other

### Industries

* Film
* Music
* Sports
* Fashion
* Business
* Media
* Technology
* Other

Customers belong to one Customer Type and one Industry.

Brands can filter by both.

---

## Customer Data

Store:

* Name
* Email
* Customer Type
* Industry
* Measurement Profile
* Saved Products
* Order History
* Account Status

Measurement profiles support male and female tailoring measurements, metric/imperial units, editing, and PDF export.

---

## Discovery

Categories:

* Casual
* Business
* Formal
* Custom

Features:

* Swipe Left = Pass
* Swipe Right = Save
* Undo
* Saved Gallery
* Category Filters

---

## Products

Types:

* Gift
* Purchase

Rules:

* Cost price hidden from customers
* Inactive products removed from discovery
* Inactive products remain visible in saved collections

---

## Checkout

* Stripe
* In-app checkout
* Order history
* Receipts
* Fulfillment workflow

---

## Brand Portal

### Registration

* Brand Name
* Category
* Admin Email
* Fulfillment Email

Statuses:

* Pending
* Approved
* Rejected

### Product Management

* Create/Edit/Delete
* Activate/Deactivate
* Upload Images
* CSV Import

### Access Policies

* Open
* Selective
* Invite Only

### Gifting

* Customer allowances
* Rolling or calendar periods
* Usage tracking
* Manual reset

Customers never see gifting budgets.

### Fulfillment

* Manual shipping
* Order notifications
* PDF invoices
* Order status tracking

No inventory synchronization in MVP.

---

## Platform Rules

Customers never see:

* Approval decisions
* Denials
* Gifting budgets
* Internal brand data

Brands never see:

* Other brands
* Other brand customers
* Other brand products
* Other brand budgets

All authorization must be enforced server-side.

---

## Compliance & Security

Requirements:

* GDPR
* CCPA
* RBAC
* Audit Logs
* Secure Sessions
* Encrypted Sensitive Data
* PII Minimization
* Brand Data Isolation
* Data Export & Deletion

Platform must support high-profile users including celebrities, athletes, and influencers.

---

## Architecture Guidance

Claude should determine:

* Technology stack
* Database design
* API architecture
* Infrastructure
* Deployment strategy
* Authorization model
* Testing strategy
* Monitoring strategy

Priorities:

1. MVP delivery speed
2. Security
3. Maintainability
4. Scalability
5. Cost efficiency

Favor simple, production-ready solutions over premature optimization.

---

## Non-Goals (MVP)

Do not build:

* Native mobile apps
* AI features
* Messaging
* Social networking
* ERP integrations
* Inventory synchronization
* Warehouse integrations
* Multi-language support

Focus on delivering a polished, secure, production-ready MVP.
