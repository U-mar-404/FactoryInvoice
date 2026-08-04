# MESCO Order, Stock & Billing System — Project Specification

## 1. What this software is

A business system for an electrical switches/sockets manufacturer/distributor (Mesco, based on the attached price list) that replaces manual order-taking, stock tracking, and billing with a single web application. It covers the full flow from a customer placing an order, through manager approval, to dispatch and invoice generation, plus reporting on sales, stock, and receivables.

It needs to run on iOS, Android, and PC. **A single React web app (PWA)** is the right answer for this — not three separate apps. It works in any browser, can be "installed" to a phone home screen like an app, and needs zero App Store/Play Store approval or maintenance. Native mobile apps only become worth it later if you specifically need push notifications or barcode/camera scanning for stock — and even then, you'd reuse most of the code via React Native.

---

## 2. Product catalog structure

Your price list hierarchy is fully dynamic and manager-managed — this forms the core data model:

- **Series** — Dynamic, manager-managed product lines (e.g., Vector, Ambit, Waves-Cubic, Elegance) — not a hardcoded list.
- **Color** — Belongs to a Series (a series has its own set of available colors, e.g. Vector: Gold, White, Black).
- **Item Type (Product)** — the actual product (e.g. "01 – 1 Gang 1 Way Switch", "13 – Power Plug 15A"), with a code and pcs/box, consistent across all series.
- **SKU / Variant** — the sellable unit: Item Type + Series + Color, each with its own price and stock count.
- **Price History** — every SKU's price over time (like your "01-08-2022" list). Invoices always snapshot the price at the moment of sale — so if you update the rate list next month, old invoices don't silently change.
- **Soft Deletion Protections** — Products, Series, Colors, or SKUs referenced by historical orders are soft-deleted (`isActive = false`) rather than hard-deleted to ensure order history integrity remains intact.

---

## 3. User roles

| Role | Can do |
|---|---|
| **Customer** | Business account record (name, phone number, area, city, address, balance owed, assigned agent, per-series discounts). Browse catalog, place orders, view their own order/invoice history, see their own discount % and outstanding balance |
| **Manager** | Approve / deny / modify orders, manage Products & Series/Color rates (add/remove/modify items & prices), manage customer profiles (phone, city, address), set each customer's discount %, log payments received (receivables), log incoming stock from supplier, manage WhatsApp settings & QR linking, view all reports |
| **Dispatch/Store staff** | See only approved orders, view customer delivery info (city, address, phone, item/series/color/qty without pricing), mark them as dispatched (automatically triggers WhatsApp dispatch notification & PDF invoice) — nothing else |
| **Admin** | Manage user accounts, create users with required customer phone/city/address, edit user roles (`admin`, `manager`, `store`, `customer`), manage WhatsApp settings & QR linking, and delete users. |

---

## 4. Order lifecycle & Automated WhatsApp Notifications

1. **Customer places order** → status: `Pending`
2. **Manager reviews**, seeing live stock levels against the order:
   - **Approve** → status: `Approved`, moves to dispatch queue
   - **Deny** → status: `Denied`, customer notified with reason
3. **Dispatch & Notification**:
   - When Store/Manager marks an order `Dispatched`, an automated WhatsApp message is sent to the customer's phone via Baileys (unofficial WhatsApp Web API) along with an attached customer-facing priced PDF invoice (`Invoice_[OrderId].pdf`).
   - Session authentication is managed by Manager/Admin roles and persisted to server disk (`baileys_auth_info`).
   - Message template is customizable on the WhatsApp Settings page, which also provides delivery status tracking and manual resend/retry capabilities for text and PDF attachments.
   - **Known System Tradeoff / Risk Note**: Using Baileys (unofficial API) carries a potential WhatsApp account ban/suspension risk if abused.
   - **Modify** (e.g. quantities changed due to stock) → status: `Approved` immediately (modified orders do NOT go back to customer for approval)
3. **Dispatch staff** marks the approved order `Dispatched`
4. **Invoice is generated automatically at the dispatch step** — this is the only trigger for billing, using the SKU price *at the time the order was placed* and the customer's discount %.

---

## 5. Billing

- Invoice = sum of (SKU price at order time × qty) with the customer's discount % applied
- Generated only when an order is confirmed dispatched
- Rendered from an HTML template to PDF (e.g. via Puppeteer or react-pdf) so it looks like a proper printed invoice

---

## 6. Stock vs. "Receiving" — two separate things

These are easy to conflate but should be two separate tables:

- **Payments Received** — a customer pays down their outstanding balance; manager logs a "receiving" entry; reduces the customer's owed credit. This is an **accounts-receivable ledger**, tied to the customer, not to inventory.
- **Stock Receipts** — new inventory arriving from your own supplier/factory; increases stock levels for specific SKUs. Tied to inventory, not to any customer.

Both are needed, and both need their own report.

---

## 7. Reports

- **Sales** — monthly, yearly, by customer, by area/region
- **Stock** — current levels, low-stock alerts, movement history (in/out)
- **Receivables** — outstanding balance per customer, aging (how overdue), history of payments received

---

## 8. Recommended tech stack

| Layer | Recommendation | Why |
|---|---|---|
| **Frontend** | React, built as a **PWA** | One codebase for PC + mobile browsers; installable on phone home screens; works reasonably offline. Avoids building/maintaining 3 separate apps for something that's mostly forms, tables, and reports. |
| **Mobile app store presence (only if needed later)** | React Native (Expo) | Only add this if you specifically need push notifications or camera/barcode scanning for stock counts. Share TypeScript types and the API client with the web app in a monorepo to avoid duplicating logic. |
| **Backend** | Node.js + TypeScript (NestJS or Express) | Same language as the frontend — much easier for a small team to maintain than splitting Node and Python. |
| **Database** | **PostgreSQL**, not generic "SQL" | You're right to want SQL — this data is deeply relational (orders → items → SKUs → prices → invoices) and needs real transactions so stock and billing never fall out of sync. Postgres beats MySQL here mainly for stronger support of complex reporting queries (window functions, CTEs), which you'll lean on heavily for monthly/yearly/area-wise reports. |
| **ORM** | Prisma | Type-safe queries, painless migrations, pairs naturally with a TypeScript backend. |
| **Auth** | Role-based (Admin / Customer / Manager / Store), via JWT | Login with Username & Password; backend autodetects user role upon authentication. |
| **Invoicing PDFs** | Render an HTML invoice template to PDF | |

---

## 9. Reference

Item catalog and pricing are based on the attached Mesco price list (dated 01-08-2022), covering 36 item types across Vector, Ambit, and Waves/Cubic series — including switches (1–10 gang, 1-way and 2-way), combination switch+socket units, plugs, TV/telephone sockets, bell push, spares, and dimmers.
