# Architecture

See design.md in .kiro/specs/btg-v4-rebuild/ for full architecture details.

## Quick Overview

```
Browser (React SPA)
    │
    │ /api/v1/* (proxied via vercel.json)
    ▼
Vercel Serverless Function — api/index.js
    │
    ▼
Express App — backend/src/app.js
    ├── /auth       → Auth Module
    ├── /catalog    → Catalog Module
    ├── /admin      → Admin Routes (protected)
    └── /branding   → Ops Module
    │
    ▼
MongoDB Atlas
```
