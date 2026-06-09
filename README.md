# BTG v4 — Badol Tyre Ghar

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Live](https://img.shields.io/badge/live-production-green.svg)](https://btg-v4.vercel.app)

> B2B tyre wholesale platform for Badol Tyre Ghar — a comprehensive product catalog, dealer management, and ERP/CRM system built for Bangladesh's tyre wholesale market.

## Overview

BTG v4 is a production-ready B2B platform that enables:
- **Public Catalog Browsing** — Anyone can view products, but prices are hidden for non-dealers
- **Dealer Registration & Tiered Pricing** — Dealers register, get admin approval, and access wholesale prices based on their tier (Standard, Silver, Gold, Platinum)
- **Admin Panel** — Complete dealer approval workflow, product management, inquiry handling, campaign management
- **PDF Generation** — Dealers can download professional PDF quotations of their cart items
- **Notification System** — Real-time notifications for dealers and admins (polling-based, no WebSockets)

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | React | 19.0 |
| | Vite | 6.0 |
| | React Router | 7.1 |
| | CSS Modules | Native |
| **Backend** | Node.js | 20+ |
| | Express | 5.2 |
| | MongoDB | 9.6 (Mongoose) |
| | JWT | 9.0 |
| **Infrastructure** | Vercel | Serverless Functions |
| | Cloudinary | Image hosting |
| | MongoDB Atlas | Database |
| **Testing** | Jest | 29.7 (Backend) |
| | Vitest | 2.1 (Frontend) |
| | Supertest | 7.0 (API tests) |
| | fast-check | 3.23 (Property-based tests) |

## Local Setup

### Prerequisites
- **Node.js 20+** (with `--env-file` flag support)
- **MongoDB** (local instance or Atlas connection string)
- **Cloudinary account** (for image uploads)
- **Git**

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd btg-v4

# Backend setup
cd backend
cp .env.example .env
# Fill in all required environment variables (see .env.example)
npm install
npm run dev

# Frontend setup (in a new terminal)
cd ../frontend
cp .env.example .env
# Set VITE_API_URL=http://localhost:3000/api/v1
npm install
npm run dev
```

### Environment Variables

**Backend (.env):**
```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/btg-v4
JWT_SECRET=<your-secret>
JWT_REFRESH_SECRET=<your-refresh-secret>
PASSWORD_PEPPER=<your-pepper>
CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>
FRONTEND_URL=http://localhost:5173
```

**Frontend (.env):**
```env
VITE_API_URL=http://localhost:3000/api/v1
```

### Git Hooks Setup (Recommended)

Enable automated structure validation before commits:

```bash
# Configure git to use project hooks (one-time setup)
git config core.hooksPath .githooks

# Unix/Mac/Linux: Make hooks executable
chmod +x .githooks/pre-commit
```

**What this does:**
- ✅ Validates project structure before every commit
- ✅ Ensures CSS modules are paired with components
- ✅ Checks backend module structure
- ✅ Prevents forbidden files/folders
- ✅ Blocks commits if violations found

**More info:** See [.githooks/README.md](.githooks/README.md) for complete documentation.

### Development Commands

**Backend:**
```bash
npm run dev          # Start with nodemon (hot reload)
npm start            # Production start
npm test             # Run all tests
npm test -- --watch  # Watch mode
```

**Frontend:**
```bash
npm run dev       # Start dev server (port 5173)
npm run build     # Production build
npm run preview   # Preview production build
npm test          # Run tests
npm run lint      # ESLint check
npm run format    # Format with Prettier
```

## Project Structure

```
btg-v4/
├── frontend/                # React SPA
│   ├── src/
│   │   ├── components/      # Reusable UI components (with .module.css)
│   │   ├── pages/           # Route pages
│   │   ├── context/         # React Context (Auth, Cart)
│   │   ├── hooks/           # Custom hooks (useFetch, useNotifications)
│   │   ├── services/        # API client
│   │   ├── utils/           # Validators, formatters, constants
│   │   └── styles/          # Global CSS
│   ├── tests/               # Frontend tests (Vitest)
│   └── package.json
├── backend/                 # Express API
│   ├── src/
│   │   ├── modules/         # Feature modules (auth, catalog, users, etc.)
│   │   ├── middleware/      # Auth, rate limiting, validation
│   │   ├── utils/           # Shared utilities (pricing, validators, etc.)
│   │   ├── config/          # Database, Cloudinary config
│   │   ├── routes/          # Route aggregators
│   │   └── app.js           # Express app instance
│   ├── tests/               # Backend tests (Jest)
│   ├── index.js             # Server entry point
│   └── package.json
├── api/                     # Vercel serverless wrapper
│   └── index.js
├── docs/                    # Documentation
│   ├── ARCHITECTURE.md      # System design & decisions
│   ├── API.md               # Complete API reference
│   ├── SOP.md               # Setup & operations guide
│   ├── CONTRIBUTING.md      # Contribution guidelines
│   └── CHANGELOG.md         # Version history
├── vercel.json              # Vercel deployment config
└── README.md                # This file
```

## Key Features

### 1. **Public Catalog (Unauthenticated)**
- Browse all products with images, descriptions, specifications
- Search and filter by category, brand, size
- Prices are **hidden** for non-dealers

### 2. **Dealer Registration & Approval**
- Dealers register with business details
- Status: `pending` → Admin approves → `approved`
- Rejected dealers can reapply after 30 days

### 3. **Tiered Pricing System**
- **Standard:** Base wholesale price
- **Silver:** 5% discount
- **Gold:** 10% discount
- **Platinum:** 15% discount
- Admins assign tiers based on business relationship

### 4. **Admin Panel**
- Approve/reject dealer registrations
- Manage products (CRUD operations)
- Handle customer inquiries
- Create/manage campaigns
- Bulk CSV import for products
- View analytics & search logs

### 5. **PDF Quotations**
- Dealers can download professional PDF invoices of their cart
- Includes business branding, product details, tier-based pricing
- Generated server-side using `@react-pdf/renderer`

### 6. **Notifications**
- Dealers: registration approval, inquiry responses
- Admins: new dealer registrations, new inquiries
- Polling-based (5-second interval), no WebSockets

## Documentation

**📚 [Complete Documentation Index](docs/README.md)**

**Quick Links:**
- **[Getting Started](docs/getting-started/START-HERE.md)** — Your entry point
- **[API Reference](docs/api/endpoints.md)** — All endpoints documented
- **[Security Guide](docs/security/fixes-priority.md)** — Critical security fixes
- **[Architecture](docs/architecture/overview.md)** — System design
- **[Deployment](docs/guides/deployment-and-operations.md)** — Production deployment
- **[Contributing](CONTRIBUTING.md)** — How to contribute

## Testing

```bash
# Backend tests
cd backend
npm test                          # Run all tests
npm test -- --testPathPattern=auth  # Run specific test file
npm test -- --coverage            # With coverage report

# Frontend tests
cd frontend
npm test                  # Run all tests
npm test -- --watch       # Watch mode
npm test -- --coverage    # With coverage report
```

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to `main` branch

**Environment Variables to Set:**
- All backend `.env` variables (without `NODE_ENV`)
- `FRONTEND_URL` (your Vercel domain)

### Manual Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

## Code Style & Principles

**⚠️ MANDATORY: Every developer MUST read and follow [CODE_STYLE.md](CODE_STYLE.md)**

This project follows strict engineering principles:
- ✅ **Proper if/else blocks** — No ternary chains
- ✅ **Descriptive variable names** — No abbreviations (except standard: req, res, err, id)
- ✅ **Functions < 40 lines** — Single responsibility principle
- ✅ **Comments explain WHY, not WHAT**
- ✅ **Named constants** for magic numbers
- ✅ **No prohibited libraries:** zod, axios, framer-motion, react-hook-form, @tanstack/react-query, tailwind
- ✅ **Backend:** CommonJS only (require/module.exports)
- ✅ **Frontend:** CSS Modules on every component
- ✅ **sendResponse()** in all controllers
- ✅ **try/catch** in every async function

**📖 Read the complete style guide:** [CODE_STYLE.md](CODE_STYLE.md)

## License

MIT

## Support

For issues or questions, contact: [your-email@example.com]

---

**Built with ❤️ for Badol Tyre Ghar**
