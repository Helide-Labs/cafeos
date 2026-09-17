# CaféOS product plan

## Product direction

CaféOS is a multi-tenant operating system for cafés. Its advantage is not the number of modules; it is the connected data chain from sale to recipe, stock, supplier cost, profit, and actionable recommendations.

Primary users are independent café owners, growing multi-branch operators, managers, cashiers, baristas, kitchen staff, and inventory teams. The initial market assumptions are LKR pricing, Sri Lankan payments, and mobile-first owner access.

## Release roadmap

### Phase 1 — usable operating core

1. Authentication, tenant setup, branch setup, roles, and permissions.
2. Menu categories, products, modifier groups, pricing, availability, and recipes.
3. Coffee-specific POS with dine-in, pickup, discounts, tips, split payments, and receipts.
4. Order lifecycle, refunds, cash sessions, and basic fulfillment views.
5. Ingredient and packaging stock, units, adjustments, counts, waste, and low-stock alerts.
6. Recipe costing, automatic stock consumption, COGS, gross margin, and basic reports.
7. Owner dashboard with sales, profit, stock, products, and operational alerts.

### Phase 2 — customer revenue

QR table menus, online ordering, scheduled pickup, customer profiles, loyalty points/stamps/memberships, coupons, feedback, and lifecycle campaigns.

### Phase 3 — café operations

Bar/kitchen/pickup KDS, supplier catalogues, purchase orders and receiving, staff profiles, scheduling, time clock, attendance, labour cost, food-safety checklists, temperature logs, and incident records.

### Phase 4 — intelligence

Invoice OCR with approval workflow, menu engineering, demand and stock forecasting, waste prediction, price recommendations, natural-language business analysis, and explainable alerts.

### Phase 5 — scale and enterprise

HQ multi-branch controls, transfers, franchise and white-label support, accounting, local payment and delivery integrations, advanced RBAC, audit exports, public API, and webhooks.

## Phase 1 journeys

- Owner creates a café and branch, invites staff, configures tax and currency, and imports or creates a menu.
- Manager defines ingredients, units, supplier prices, recipes, minimum stock, and product modifiers.
- Cashier opens a shift, customizes an order, takes payment, issues a receipt, and handles an approved refund.
- A completed order consumes recipe stock and updates COGS, margin, dashboard totals, and low-stock projections.
- Owner reviews daily performance, product mix, stock risks, waste, and branch activity from desktop or mobile.

## Architecture

- Next.js App Router and TypeScript for the web application and server endpoints.
- PostgreSQL with tenant-scoped tables and database constraints; Prisma as the initial ORM.
- Modular monolith boundaries: identity, tenants, branches, catalog, recipes, sales, inventory, customers, staff, reporting, and notifications.
- Redis later for rate limits, short-lived sessions, queues, and real-time fan-out.
- Object storage for receipts, invoices, exports, and product media.
- Background jobs for stock projections, report aggregation, notifications, and OCR.
- PWA shell for owners and operational screens; offline-tolerant POS is a post-MVP milestone.

Every business record carries a tenant ID; branch-scoped records also carry a branch ID. Authorization is enforced server-side, supported by RBAC, audit logs, MFA, session/device controls, encrypted transport/storage, backups, and tenant-isolation tests.

## Core data model

Tenant → branches, users, roles, settings  
Catalog → categories, products, variants, modifier groups, prices  
Recipe → ingredients, units, conversions, recipe lines, packaging  
Sales → shifts, orders, order items, modifiers, payments, refunds  
Inventory → locations, batches, stock ledger, counts, transfers, waste  
Reporting → daily aggregates, product metrics, alerts

Inventory uses an immutable stock ledger. Order, payment, and inventory updates share transactional boundaries and idempotency keys so retries cannot duplicate sales or stock movements.

## Delivery slices

1. Product shell and dashboard prototype.
2. Tenant-aware database schema and seed data.
3. Authentication, onboarding, branch context, and RBAC.
4. Catalog, modifiers, recipe editor, and costing.
5. POS basket, checkout, payments, and receipts.
6. Order management and fulfillment.
7. Stock ledger, counts, adjustments, waste, and alerts.
8. Operational reporting, responsive/PWA hardening, and pilot readiness.

## Quality gates

Each slice requires type-checking, linting, unit tests for money/unit calculations, integration tests for tenant isolation and transactions, and end-to-end tests for critical journeys. Before pilot: accessibility review, security review, backup restore test, performance budget, audit coverage, error monitoring, and documented data export/deletion.

## Initial success measures

Time to first completed sale, checkout duration, stock accuracy, percentage of menu items with recipes, dashboard usage, prevented stock-outs, reduced waste cost, pilot retention, and support requests per 100 orders.
