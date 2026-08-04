# Project: Mesco Order, Stock & Billing System

## What this is
A B2B ordering, stock, and billing web app for Mesco (electrical switches & sockets manufacturer/distributor). Four roles share one system: System Admin manages user accounts and role assignments, Customers order, a Manager approves/adjusts orders and manages catalog/rates, and Store staff dispatch and print invoices. Runs as a single responsive web app (PWA) — no separate native codebases unless explicitly asked.

Reference prototype (working HTML/JS mock with the full UI and flow already validated) lives at `/prototype/mesco-app.html` if present in this repo — treat it as the source of truth for UI/UX and interaction details, not for architecture. The real build replaces its in-browser storage with a proper backend.

## Tech stack
- Frontend: React + TypeScript, built as a PWA
- Backend: Node.js + TypeScript (Express)
- Database: PostgreSQL (relational by design — do not suggest NoSQL alternatives for this data)
- ORM: Prisma
- Auth: Role-based (admin / customer / manager / store), JWT-based sessions. Login uses Username & Password only; backend autodetects the role and routes the user automatically.
- PDF invoices: HTML popup print rendering template
- Monorepo/Shared: shared TypeScript types/API client between frontend and backend

## Commands
- Install (frontend): `npm install`
- Install (backend): `npm install --prefix backend`
- Dev (frontend): `npm run dev`
- Dev (backend): `npm run dev --prefix backend`
- DB generate: `npx prisma generate --schema=backend/prisma/schema.prisma`
- DB seed: `npx prisma db seed --schema=backend/prisma/schema.prisma`
- Build (frontend): `npm run build`
- Build (backend): `npm run build --prefix backend`

## Data model (do not deviate without discussion)
- `User` — system user account (username, passwordHash, name, role: ADMIN / MANAGER / STORE / CUSTOMER, optional customerId link). Separate from the Customer business record.
- `Agent` — Manager-managed sales agent entity (name, contact info, linked to assigned Customers).
- `Series` — Manager-managed entity (name, e.g. Vector, Ambit, WavesCubic, Elegance, etc.) — not a hardcoded list.
- `Color` — Belongs to a Series (a series has its own set of available colors, e.g. Vector: Gold/White/Black).
- `ItemType` (`Product`) — code, name, pcs/box, optional `imageUrl` (thumbnail image stored locally under `backend/uploads/products/` served via `/uploads`, structured for easy future S3/cloud storage backup planning).
- `SKU` — the sellable unit: ItemType + Series + Color, each with its own current price, `stockQty`, and `minStockLevel`.
- `PriceHistory` — every SKU's price over time. **Orders/invoices always snapshot the price at order time — never read live prices for existing orders.**
- `Customer` — business account (name, phone number, area, city, address, balance owed, assigned agentId, per-series discounts, linked to User account). Customer city and address appear on Store's packing slip for delivery/logistics purposes.
- `CustomerSeriesDiscount` — per-series discount rate for a customer (customerId, seriesId, discountPercent).
- `Order` — belongs to a Customer, has line items (SKU, qty, price-at-order-time, series-discount-at-order-time), a status, and a timestamped history.
- `Payment` (a.k.a. "Receiving") — a customer payment logged against their balance. **This is distinct from stock receipts.**
- `StockReceipt` — new inventory arriving from the supplier (SKU, qty added, addedById/Name, timestamp), increases SKU `stockQty`. **Distinct from Payments — do not merge these two into one table or one UI flow.**

## Business rules (these are decided — do not re-litigate or "improve" them)
1. **Order lifecycle:** `pending` → `approved` | `denied` | `modified→approved` → `dispatched`.
2. **Modified orders do NOT go back to the customer for confirmation.** The Manager edits quantities/items directly; the order becomes `approved` immediately; the customer just sees the final version when they check their order. No approval step, no special "modified" flag shown to the customer.
3. **Invoice generation is triggered only when Store marks an order `dispatched`** — never earlier. At that moment: (a) the invoice locks in the price-at-order-time × per-series discounts, (b) the total is added to the customer's balance (accounts receivable), and (c) the relevant SKUs' `stockQty` is reduced by the dispatched amounts in a DB transaction (preventing negative/over-dispatch).
4. **Per-Series Discount % is per-customer, set only by the Manager.** Applied at order time per line item series, not editable by the customer.
5. **Sales Agents:** Manager manages Agents and assigns an Agent to each Customer record.
6. **Stock Management & Audit Trail:** Stock is tracked per SKU (`stockQty` & `minStockLevel`). Stock additions create an audit `StockReceipt` entry and run inside DB transactions. Store staff and Manager can add stock. Only Manager can edit `minStockLevel`. Manager Reports page displays Low Stock Alerts for any SKU at or below `minStockLevel`.
7. **Rate list changes (Manager editing SKU prices) never retroactively change existing orders or invoices** — only new orders after the change use the new price.
8. **Soft Deletion Protections:** Series, Colors, Products (ItemTypes), or SKUs referenced by past historical orders are **soft-deleted (`isActive = false`)**, never hard-deleted, so historical order/invoice data remains consistent.
9. **User Account Creation & Role Management:** Only `Admin` can create accounts, edit roles (`admin`, `manager`, `store`, `customer`), or delete users. Password inputs must be at least 6 characters long and are hashed server-side using `bcrypt` (`bcrypt.hash(password, 10)`). Login verifies submitted passwords with `bcrypt.compare`. There is no public registration/self-signup. **Bootstrapped Admin Account:** On fresh setup or initial deployment, running `npx prisma db seed --schema=backend/prisma/schema.prisma` seeds the initial bootstrapped `admin` user (username: `admin`, password: `admin123`). The initial admin logs in to create all subsequent real user accounts via the Admin panel.
10. **Roles are strictly scoped:**
   - **Admin:** User account CRUD and role/permission assignment.
   - **Store:** Store staff view `approved`/`dispatched` orders, mark dispatch, and add stock quantity — they cannot edit minimum stock levels, approve/deny/modify orders, or see rates/customers/reports.
   - **Customer:** Customers only ever see their own orders/account, never other customers' data or the rate list's cost basis.
   - **Manager:** Manager approves, denies, modifies orders, manages Products/Series/Colors catalog rates, sets customer discounts, logs payments, manages stock/minimum levels, manages WhatsApp settings/QR linking, and views business reports.
11. **WhatsApp Dispatch Notifications & PDF Invoices:** Automated WhatsApp dispatch messages are sent via Baileys (unofficial API) when an order is marked `dispatched`. Notifications include a customer-facing priced PDF invoice attachment (`application/pdf`) alongside the text message. Managers can view delivery logs, track text/PDF delivery status, and manually resend notifications + PDF attachments from the WhatsApp Settings page. The WhatsApp session is linked and managed exclusively by Manager/Admin roles and persisted to disk (`baileys_auth_info`). **Tradeoff Note:** Using Baileys (unofficial WhatsApp Web API) carries a potential account ban/suspension risk from WhatsApp as a known system tradeoff.

## Design & UI conventions
- Two-tone palette: deep navy (`#0B1B42`) + blue accent (`#2F6FED`) on white, minimal, not maximalist.
- Left sidebar navigation for all four roles, consistent structure: active-item indicator, role-appropriate nav items only.
- Fonts: Space Grotesk for headings/display, Inter for body/UI text.
- Motion should be purposeful and restrained: sliding active-indicators, panel fade/slide-ins, toast confirmations — not decorative animation everywhere.
- Keep the customer UI simpler than the manager/admin UI; the manager and admin UIs carry more density (tables, forms, reports).

## Coding conventions
- TypeScript strict mode on both frontend and backend.
- Explicit types for API request/response shapes shared between frontend and backend.
- Money values: store as integers (smallest currency unit) or `numeric` in Postgres — never `float`.
- All money-affecting mutations (order status changes, dispatch, payments) must run inside a DB transaction — stock, balance, and order status must never fall out of sync.
- Keep business rules (see above) enforced server-side, not just in the UI — the UI should reflect what the API allows, not gate it alone.

## What NOT to do
- Don't hard-delete Products, Series, or Colors referenced by historical orders — always deactivate (`isActive = false`).
- Don't add a customer-facing approval step for modified orders — this was explicitly rejected.
- Don't merge Payments (accounts receivable) and Stock Receipts (inventory) into a single table/flow.
- Don't let invoices reference live/current SKU prices — always the price snapshot from order time.
- Don't scaffold a NoSQL database or suggest one "for scale" — the relational structure and transactional needs are the actual requirement here.
- Don't ask the user to select their role on the login screen — authentication automatically inspects user account role in DB.

## Progress log
Read `PROGRESS.md` at the start of every session before making changes — it tells you what's already built and what's next.
After completing any task, append (don't rewrite) a short entry: date, 1-3 bullet lines on what changed, one "Next:" line. Keep entries terse — file names and outcomes, not explanations. Never delete or edit past entries, only add new ones.