# Badol Tyre Ghar v4

![Node.js](https://img.shields.io/badge/Node.js-LTS-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-v5-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)
![React](https://img.shields.io/badge/React-v19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-v6-646CFF?logo=vite&logoColor=white)
![License](https://img.shields.io/badge/License-Private-red)

A production-grade B2B wholesale tyre dealer management platform built for a Bangladeshi tyre distributor. Public visitors browse the catalog. Approved dealers see wholesale pricing, apply tier and campaign discounts, and submit purchase inquiries. Admins run the whole operation from a single dashboard.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Pricing Engine](#pricing-engine)
- [Security Model](#security-model)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Overview](#api-overview)
- [Testing](#testing)
- [Deployment](#deployment)

---

## Overview

BTG v4 is built around a straightforward business model with a non-trivial technical requirement: **prices are a secret unless you're an approved dealer**.

Public visitors land on a clean product catalog — categories, brands, search, pagination, product detail pages with image galleries. They can browse freely. They see no prices.

Once a dealer registers and an admin approves their account, the experience changes. The same catalog now shows wholesale prices, automatically adjusted for their tier (standard, silver, gold, platinum), any active campaigns, and an optional per-dealer extra discount. All of this is computed server-side. The frontend never touches a price calculation.

Dealers add items to an inquiry cart and submit it — which generates a structured WhatsApp message pre-filled with product names, SKUs, and quantities. That's the B2B flow: browse → inquire → WhatsApp negotiation → order.

Admins have a full management panel: product catalog CRUD with bulk CSV import, dealer onboarding and tier management, campaign management, media library, order tracking, notification center, search analytics, and site configuration (maintenance mode, announcement banners, WhatsApp number).

---

## Key Features

### Public
- Product catalog with category, brand, and text search filters
- Paginated results, mobile-first responsive design
- Product detail pages with image gallery (swipe on mobile), variant selector, and specs
- No prices visible to unauthenticated visitors

### Dealer (approved accounts only)
- Wholesale pricing with tier discounts: Standard (0%), Silver (5%), Gold (10%), Platinum (15%)
- Per-dealer extra discount multiplier set by admin
- Campaign discounts — percent or flat, scoped by product, category, or brand
- Inquiry cart → auto-generated WhatsApp purchase message
- PDF catalog download (by category or full catalog)
- Order history and account stats in profile

### Admin Panel
- Dashboard with KPI cards and charts (products by brand, dealer registrations over time)
- Dealer registration approvals with pending/approved/rejected workflow and tier management
- Product catalog management: visibility toggle, per-variant stock updates
- Bulk CSV product import and bulk price markup tools
- Search analytics — see what dealers are searching for
- Campaign management: create, edit, activate/deactivate, delete
- Media library with Cloudinary upload and delete
- Notification center
- Order management: status tracking, payment tracking, invoice PDF download
- Site configuration: maintenance mode, announcement banner, WhatsApp number

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend runtime | Node.js (LTS), CommonJS |
| Backend framework | Express v5 |
| Database | MongoDB Atlas, Mongoose v9 |
| Auth | JWT (15min access) + httpOnly refresh cookie (30 days) + bcrypt (12 rounds) + PASSWORD_PEPPER |
| Frontend framework | React v19, Vite v6 |
| Frontend routing | React Router v7 |
| Styling | CSS Modules |
| Charts | Recharts |
| Icons | Lucide React |
| PDF generation | @react-pdf/renderer |
| Media storage | Cloudinary (max 5MB, JPEG/PNG/WebP) |
| Backend testing | Jest + Supertest + fast-check |
| Frontend testing | Vitest + @testing-library/react |
| Deployment | Vercel (frontend) + Railway/Render (backend) |

---

## Architecture

BTG v4 is a **modular monolith** — a single deployable backend with clean internal module boundaries. Each module owns its model, service, controller, and routes. Modules communicate via service imports. Nothing reaches across into another module's database layer directly.

```
Browser
  │  HTTPS
  ▼
Vercel (React SPA)
  │  HTTPS API calls
  ▼
Railway / Render (Express API)
  │  MongoDB Atlas connection
  ▼
MongoDB Atlas
  │  Media operations
  ▼
Cloudinary
```

### Backend Modules

| Module | Responsibility |
|---|---|
| `auth` | Registration, login, JWT issuance, refresh token rotation, token theft detection |
| `catalog` | Products, categories, brands, campaigns, search, search analytics |
| `orders` | Inquiry submission, order status, invoice PDF |
| `media` | Cloudinary upload/delete, media asset management |
| `notifications` | Admin notification creation and read state |
| `siteConfig` | Site-wide settings, maintenance mode, announcement banner |
| `users` | Dealer management, approval workflow, tier assignment |

### Request Lifecycle

```
HTTP Request
    │
    ▼
Route  (URL mapping + middleware chain — no business logic)
    │
    ▼
Controller  (HTTP parsing + response formatting — no business logic)
    │
    ▼
Service  (all business logic lives here)
    │
    ▼
Model  (data access only)
    │
    ▼
MongoDB Atlas
```

Business logic never leaks into routes or controllers. The controller's only job is to receive an HTTP request, call a service, and format the response. The service's only job is to implement the rules.

### Authentication Flow

1. Login returns an `accessToken` in the response body (15min expiry)
2. A `btg_refresh` httpOnly cookie is set alongside it (30 days)
3. The frontend stores the access token in memory only — never localStorage
4. On 401, the frontend automatically calls `POST /auth/refresh` — the cookie is sent automatically
5. A new access token is issued and the old refresh token is rotated
6. If a revoked refresh token is ever reused, **all sessions for that user are immediately revoked** (token theft detection)
7. Only the SHA-256 hash of the refresh token is stored in the database — the raw value exists only in the httpOnly cookie

### Frontend Data Flow

```
AuthContext (bootstraps on mount, restores session)
    │  waits for auth bootstrap to complete
    ▼
Page component (lazy loaded)
    │
    ▼
useFetch(path, ready: !authLoading)  ← race condition prevented at the hook level
    │
    ▼
api service (injects Bearer token, handles 401 refresh automatically)
    │
    ▼
Backend
```

The auth race condition is handled at the `useFetch` hook level. No authenticated fetch fires until `AuthContext` has finished bootstrapping. This is a first-class constraint, not an afterthought.

---

## Pricing Engine

Pricing is 100% server-side. The frontend receives computed prices and displays them — it never derives, adjusts, or interpolates them.

The pricing stack applied in order:

1. **Base price** — `wholesalePrice` for approved dealers, admins, and editors; `retailPrice` for everyone else
2. **Dealer multiplier** — per-dealer extra discount (%) set by admin, defaults to 0
3. **Tier discount** — Standard 0%, Silver 5%, Gold 10%, Platinum 15% (percentages are configurable via the `TierPricingRule` model)
4. **Campaign discount** — best matching active campaign by product, category, or brand; either percent or flat value
5. **Round** to 2 decimal places, clamped to ≥ 0

Active campaigns and tier rules are cached in-memory with a 60-second TTL to avoid hitting the database on every catalog request.

---

## Security Model

Security is built in from the start, not added later.

| Concern | Implementation |
|---|---|
| Query timeout | Every Mongoose query has `.maxTimeMS(5000)` — prevents slow query DoS |
| Refresh token storage | SHA-256 hash stored in DB; raw value in httpOnly cookie only |
| Token theft detection | Revoked token reuse → all sessions for that user revoked |
| Password hashing | bcrypt, 12 rounds + `PASSWORD_PEPPER` prepended before hashing |
| Rate limiting | Login: 10 req/15min per IP. Register: 5 req/60min per IP |
| Auth middleware order | `protect` always runs before `restrictTo` — never reversed |
| Soft delete | No hard deletes anywhere in the system |
| Audit logging | Every admin POST/PATCH/DELETE writes an audit log (fire-and-forget) |
| Input validation | 1MB request body limit; 5MB file limit; JPEG/PNG/WebP only |
| CORS | Explicit allowed origins; `credentials: true` for cookie support; no wildcard |
| Data exposure | `password` field has `select: false`; JWT payload contains only `{ userId, role, registrationStatus, tier }` — no PII |

---

## Project Structure

```
btg-v4/
├── backend/
│   ├── src/
│   │   ├── app.js                    # Express app setup, middleware, CORS
│   │   ├── config/
│   │   │   └── db.js                 # MongoDB Atlas connection
│   │   ├── middleware/
│   │   │   ├── auth.js               # protect, restrictTo, optionalAuth
│   │   │   ├── rateLimiter.js        # loginLimiter, registerLimiter
│   │   │   └── activityLogger.js     # audit log middleware
│   │   ├── modules/
│   │   │   ├── auth/                 # auth.service, auth.controller, auth.routes, RefreshToken.model
│   │   │   ├── catalog/              # Product, Category, Brand, Campaign, Inquiry, SearchLog models
│   │   │   ├── media/                # Cloudinary integration, MediaAsset model
│   │   │   ├── notifications/        # Notification model, service, controller
│   │   │   ├── siteConfig/           # SiteConfig model (singleton), service, controller
│   │   │   └── users/                # User model, dealer management service and controller
│   │   ├── routes/
│   │   │   ├── index.js              # Public route aggregator
│   │   │   └── admin.js              # Admin route aggregator (protect applied here for all)
│   │   └── utils/
│   │       ├── pricingService.js     # The entire pricing engine
│   │       ├── sendResponse.js       # Consistent response formatter
│   │       ├── validators.js         # Input validation helpers
│   │       └── auditLogger.js        # Audit log writer
│   ├── index.js                      # Server entry point
│   └── .env.example                  # All required environment variables (no real values)
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── layout/               # Navbar, Footer, AdminLayout
│       │   ├── ui/                   # Shared primitives (Button, Badge, Modal, etc.)
│       │   ├── catalog/              # Product cards, filters, gallery, variant selector
│       │   └── pdf/                  # PDF catalog document components
│       ├── context/
│       │   ├── AuthContext.jsx       # Auth state, bootstrap, login, logout, refreshUser
│       │   └── CartContext.jsx       # Inquiry cart state
│       ├── hooks/
│       │   ├── useFetch.js           # Data fetching with auth-ready guard
│       │   └── usePdfDownload.js     # PDF generation hook
│       ├── pages/
│       │   ├── public/               # Home, Catalog, ProductDetail
│       │   ├── auth/                 # Login, Register
│       │   ├── dealer/               # Profile, OrderHistory
│       │   └── admin/                # Dashboard, AdminCatalog, Dealers, Campaigns, etc.
│       ├── services/
│       │   └── api.js                # Axios instance with token injection and auto-refresh
│       ├── styles/
│       │   ├── variables.css         # All design tokens (colors, spacing, radius)
│       │   └── global.css            # Base resets and global styles
│       └── utils/
│           ├── formatters.js         # Price, date, and number formatters
│           ├── validators.js         # Frontend input validators
│           ├── constants.js          # App-wide constants
│           └── imageUtils.js         # Cloudinary URL transform helpers
└── api/
    └── index.js                      # Vercel serverless entry point
```

---

## Getting Started

### Prerequisites

- Node.js LTS
- A MongoDB Atlas cluster
- A Cloudinary account

### Clone and install

```bash
git clone <repo-url>
cd btg-v4
```

**Backend:**

```bash
cd backend
npm install
cp .env.example .env
# Fill in your values in .env
npm run dev
# API running at http://localhost:3000
```

**Frontend:**

```bash
cd frontend
npm install
cp .env.example .env
# Fill in VITE_API_URL and VITE_WHATSAPP_NUMBER
npm run dev
# App running at http://localhost:5173
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens |
| `JWT_ACCESS_EXPIRES_IN` | Access token TTL — `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token TTL — `30d` |
| `PASSWORD_PEPPER` | Prepended to passwords before bcrypt hashing |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud identifier |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `FRONTEND_URL` | Allowed CORS origin — `http://localhost:5173` in dev |
| `NODE_ENV` | `development` or `production` |
| `PORT` | Server port — `3000` |

### Frontend (`frontend/.env`)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API base URL — `http://localhost:3000/api/v1` |
| `VITE_WHATSAPP_NUMBER` | WhatsApp number for inquiry submissions |

All variables are documented with placeholder values in `backend/.env.example`. No real secrets are committed.

---

## API Overview

Base URL: `http://localhost:3000/api/v1`

All responses follow a consistent envelope:

```json
{ "success": true, "message": "Products fetched.", "data": [...] }
{ "success": false, "message": "Product not found.", "data": null }
```

Paginated responses include:

```json
{
  "success": true,
  "message": "Products fetched.",
  "data": [...],
  "pagination": { "page": 1, "limit": 20, "total": 156, "totalPages": 8 }
}
```

### Public Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/register` | Register a new dealer account |
| `POST` | `/auth/login` | Login — returns access token + sets refresh cookie |
| `POST` | `/auth/refresh` | Rotate refresh token |
| `POST` | `/auth/logout` | Revoke current session |
| `GET` | `/auth/me` | Get current user (requires token) |
| `GET` | `/catalog` | Product list with optional filters and pricing if authenticated dealer |
| `GET` | `/catalog/:slug` | Single product detail |
| `GET` | `/categories` | All active categories |
| `GET` | `/brands` | All active brands |
| `POST` | `/inquiries` | Submit a purchase inquiry (authenticated or guest) |
| `GET` | `/site-config` | Public site configuration |

### Admin Endpoints (require `Authorization: Bearer <token>` + admin role)

| Method | Path | Description |
|---|---|---|
| `POST` | `/admin/catalog` | Create product |
| `PATCH` | `/admin/catalog/:id` | Update product |
| `DELETE` | `/admin/catalog/:id` | Soft delete product |
| `PATCH` | `/admin/catalog/:id/stock` | Update per-variant stock |
| `POST` | `/admin/catalog/bulk-create` | Bulk import from CSV |
| `POST` | `/admin/catalog/bulk-markup` | Bulk price adjustment |
| `GET` | `/admin/catalog/search-logs` | Search term analytics |
| `POST` | `/admin/campaigns` | Create campaign |
| `PATCH` | `/admin/campaigns/:id` | Update campaign |
| `DELETE` | `/admin/campaigns/:id` | Soft delete campaign |
| `POST` | `/admin/media/upload` | Upload to Cloudinary |
| `DELETE` | `/admin/media/:id` | Delete from Cloudinary and database |
| `GET` | `/admin/inquiries` | List inquiries with status filter |
| `PATCH` | `/admin/inquiries/:id/status` | Update inquiry status |
| `GET` | `/admin/dealers` | List dealer accounts |
| `PATCH` | `/admin/dealers/:id/approve` | Approve dealer registration |
| `PATCH` | `/admin/dealers/:id/tier` | Change dealer tier |
| `PATCH` | `/admin/site-config` | Update site configuration |

Full endpoint documentation with request/response shapes is in [`backend/API_ROUTES_REFERENCE.md`](backend/API_ROUTES_REFERENCE.md).

---

## Testing

### Backend

```bash
cd backend
npm test              # run all tests with coverage report
npm run test:watch    # watch mode
```

Tests are co-located with the module they cover:

```
modules/auth/
├── auth.service.js
├── auth.service.test.js     # unit tests
└── auth.routes.test.js      # integration tests (Supertest)
```

The pricing engine (`utils/pricingService.js`) has property-based tests using **fast-check** that verify invariants hold across thousands of generated inputs — not just the cases a developer thought to write. For example: a dealer with any valid tier and any non-negative wholesale price always pays ≤ the retail price.

Coverage targets:
- `pricingService.js` and `middleware/auth.js` — 100%
- Auth service — 90%+
- Catalog service — 80%+

### Frontend

```bash
cd frontend
npm test              # vitest run with coverage
npm run test:watch    # watch mode
```

Component tests use **@testing-library/react** and focus on behaviour — what the user sees — rather than implementation details.

---

## Deployment

### Frontend → Vercel

The `frontend/` directory deploys as a standard Vite SPA.

```
Build command:   npm run build
Output dir:      dist
```

Set `VITE_API_URL` and `VITE_WHATSAPP_NUMBER` in the Vercel environment settings.

### Backend → Railway or Render

The `backend/` directory runs as a standard Node.js process.

```
Start command:   node index.js
```

Set all backend environment variables in the platform dashboard. Never commit `.env` files.

The `api/` directory at the repository root is the Vercel serverless entry point — used when the backend is also deployed on Vercel instead of a dedicated server.

### Environment Strategy

| Environment | Frontend | Backend | Database |
|---|---|---|---|
| Development | `localhost:5173` | `localhost:3000` | Atlas dev cluster |
| Production | Vercel domain | Railway/Render domain | Atlas prod cluster |

Development and production never share a database. Each environment has its own set of credentials.

### Scaling Notes

The backend is stateless by design:

- No in-memory session storage — refresh tokens live in MongoDB Atlas
- JWT is stateless — no server affinity required
- File uploads go to Cloudinary — no local disk dependency
- All application state is in Atlas

Horizontal scaling (adding instances) requires no code changes.

---

## License

Private — all rights reserved.
