# Mesco Order, Stock & Billing System

A responsive, multi-role B2B ordering, inventory, and billing application for Mesco (electrical switches & sockets manufacturer/distributor).

---

## Roles & Permissions

- **Admin**: Manage user accounts and role assignments (`ADMIN`, `MANAGER`, `STORE`, `CUSTOMER`).
- **Customer**: Browse catalog, place orders, view order & payment history, check outstanding balance and per-series discounts.
- **Manager**: Approve, deny, or modify pending orders, manage catalog rates & product series/colors, assign agents, set per-customer discounts, log payment receipts, manage stock levels, view low stock alerts, manage WhatsApp settings, and view reports.
- **Store Desk**: View approved orders, print unpriced packing slips, mark orders dispatched (automatically triggering WhatsApp text & PDF invoice notifications), and log incoming stock.

---

## Tech Stack

- **Frontend**: React + TypeScript (Vite)
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: JWT-based sessions (Username & Password with role auto-routing)
- **Notifications**: Automated WhatsApp dispatch messages & PDF invoices via Baileys & PDFKit

---

## Local Development Setup

### 1. Install Dependencies

```bash
# Frontend dependencies
npm install

# Backend dependencies
npm install --prefix backend
```

### 2. Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Ensure your PostgreSQL instance is running and update `DATABASE_URL` in `.env`.

### 3. Database Initialization & Seed

```bash
# Generate Prisma Client
npx prisma generate --schema=backend/prisma/schema.prisma

# Push schema to database
npx prisma db push --schema=backend/prisma/schema.prisma

# Seed demo data (series, products, users, customers)
npx prisma db seed --schema=backend/prisma/schema.prisma
```

### 4. Running Local Development Servers

```bash
# Terminal 1: Backend Server (runs on http://localhost:5001)
npm run dev --prefix backend

# Terminal 2: Frontend App (runs on http://localhost:5173)
npm run dev
```

---

## Testing on LAN & Mobile Devices (Same Wi-Fi Network)

To test the application on a mobile phone or another device connected to the same local Wi-Fi network:

### Step 1: Find Your Machine's Local LAN IP Address

- **Mac / Linux**: Run `ifconfig` or `ip a` (e.g. `192.168.18.108` or `192.168.1.100`).
- **Windows**: Run `ipconfig` (look for IPv4 Address under Wireless LAN / Ethernet).

### Step 2: Configure Environment Variables in `.env`

Update `VITE_API_BASE_URL` in your root `.env` file to use your machine's LAN IP address:

```env
# Change from localhost to your LAN IP:
VITE_API_BASE_URL=http://192.168.18.108:5001

# Allow CORS from any origin (or specify your LAN origins):
CORS_ORIGIN="*"
```

### Step 3: Run Dev Servers with Host Binding

```bash
# Start backend
npm run dev --prefix backend

# Start frontend bound to 0.0.0.0 (listen on all network interfaces)
npm run dev -- --host
```

### Step 4: Open on Mobile Browser

Open your phone's web browser and navigate to:

`http://192.168.18.108:5173` *(replace with your actual LAN IP)*

Log in with any account (e.g., `ali traders` / `demo123` or `manager` / `demo123`).

---

## Capacitor Native Mobile Builds

When packaging this application into a native mobile app container using **Capacitor** (or Cordova/React Native WebView):

- Set `VITE_API_BASE_URL` in `.env` to your live production API URL (e.g., `https://api.yourdomain.com`) or your LAN IP (`http://192.168.x.x:5001`) before running `npm run build`.
- The frontend client (`src/api/client.ts`) will automatically direct all REST calls to the specified network endpoint instead of local loopback (`localhost`).
