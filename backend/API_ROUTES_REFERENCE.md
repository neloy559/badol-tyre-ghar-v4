# BTG v4 — API Routes Reference

## Base URL
- Local: `http://localhost:5000/api/v1`
- Production: `https://your-domain.com/api/v1`

---

## Public Routes (No Authentication)

### Health Check
```
GET /health
→ Returns API health status
```

### Ping
```
GET /ping
→ Returns pong
```

### Authentication
```
POST /auth/register         → Register new dealer account
POST /auth/login            → Login (returns access + refresh tokens)
POST /auth/refresh          → Refresh access token
POST /auth/logout           → Logout (revoke refresh token)
```

### Catalog (Public)
```
GET /catalog                → List products (with tier pricing if authenticated)
GET /catalog/:id            → Get single product details
GET /catalog/search         → Search products
```

### Categories & Brands (Public)
```
GET /categories             → List all categories
GET /brands                 → List all brands
```

### Site Configuration (Public)
```
GET /site-config            → Get site configuration
```

### Inquiries (Public — optionalAuth)
```
POST /inquiries             → Submit inquiry (guest or authenticated)
```

---

## Admin Routes (Authentication + Role Required)

All admin routes start with `/admin` and require:
1. `Authorization: Bearer <access_token>` header
2. User role must be `admin` (or `editor` for media)

### Catalog Management (admin + editor)
```
POST   /admin/catalog                → Create product
PATCH  /admin/catalog/:id            → Update product
DELETE /admin/catalog/:id            → Soft delete product
POST   /admin/catalog/:id/variants   → Add product variant
PATCH  /admin/catalog/:id/stock      → Update stock levels
```

### Campaign Management (admin only)
```
GET    /admin/campaigns              → List all campaigns
POST   /admin/campaigns              → Create campaign
PATCH  /admin/campaigns/:id          → Update campaign
DELETE /admin/campaigns/:id          → Soft delete campaign
```

### Media Management (admin + editor)
```
POST   /admin/media/upload           → Upload media asset (multipart/form-data)
                                       field: "file", max: 5MB
                                       body: { type: 'product'|'logo'|'banner'|'other' }
GET    /admin/media                  → List media assets
                                       query: ?type=product&page=1&limit=20
DELETE /admin/media/:id              → Delete media asset
```

### Notifications (admin only)
```
GET    /admin/notifications/unread-count  → Get unread count
GET    /admin/notifications               → Get 50 recent notifications
PATCH  /admin/notifications/:id/read      → Mark notification as read
PATCH  /admin/notifications/read-all      → Mark all as read
```

### Inquiries (admin only)
```
GET    /admin/inquiries              → List inquiries
                                       query: ?status=inquired&page=1&limit=20
PATCH  /admin/inquiries/:id/status   → Update inquiry status
                                       body: { status: 'inquired'|'replied'|'converted' }
PATCH  /admin/inquiries/:id/note     → Add/update admin note
                                       body: { adminNote: "string" }
```

### Site Configuration (admin only)
```
GET    /admin/site-config             → Get site configuration
PATCH  /admin/site-config             → Update site configuration
                                        body: { siteName?, whatsappNumber?, ... }
```

### User Management (admin only)
```
GET    /admin/dealers                 → List dealer accounts
PATCH  /admin/dealers/:id/approve     → Approve dealer application
PATCH  /admin/dealers/:id/tier        → Update dealer tier
PATCH  /admin/dealers/:id/suspend     → Suspend dealer account
```

---

## Authentication Flow

### 1. Register
```http
POST /auth/register
Content-Type: application/json

{
  "name": "Dealer Name",
  "phone": "01XXXXXXXXX",
  "email": "dealer@example.com",
  "password": "SecurePass123",
  "shopName": "My Tyre Shop",
  "businessAddress": "123 Main St, Dhaka"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful. Awaiting admin approval.",
  "data": {
    "userId": "...",
    "name": "Dealer Name",
    "role": "dealer",
    "isApproved": false
  }
}
```

### 2. Login
```http
POST /auth/login
Content-Type: application/json

{
  "phone": "01XXXXXXXXX",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "accessToken": "eyJhbGc...",
    "user": {
      "userId": "...",
      "name": "Dealer Name",
      "role": "dealer",
      "tier": "standard",
      "isApproved": true
    }
  }
}
```

**Note:** Refresh token is set as httpOnly cookie.

### 3. Using Access Token
```http
GET /catalog
Authorization: Bearer eyJhbGc...
```

### 4. Refresh Access Token
```http
POST /auth/refresh
(Refresh token sent automatically via httpOnly cookie)
```

---

## Media Upload Example

```http
POST /admin/media/upload
Authorization: Bearer eyJhbGc...
Content-Type: multipart/form-data

file: [binary file data]
type: product
```

**Response:**
```json
{
  "success": true,
  "message": "Media uploaded successfully.",
  "data": {
    "_id": "...",
    "filename": "product-image.jpg",
    "cloudinaryUrl": "https://res.cloudinary.com/...",
    "type": "product",
    "size": 245760,
    "format": "jpeg"
  }
}
```

---

## Inquiry Submission Example

```http
POST /inquiries
Content-Type: application/json
Authorization: Bearer eyJhbGc... (optional)

{
  "items": [
    {
      "productId": "60d5f...",
      "variantSku": "TYRE-001-195/65R15",
      "quantity": 4
    },
    {
      "productId": "60d5f...",
      "variantSku": "TYRE-002-205/55R16",
      "quantity": 2
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Inquiry submitted successfully.",
  "data": {
    "_id": "...",
    "user": "60d5f...",
    "items": [...],
    "status": "inquired",
    "whatsappMessage": "BTG Inquiry:\n\n4x Product Name (SKU: TYRE-001-195/65R15)\n2x Product Name (SKU: TYRE-002-205/55R16)\n",
    "createdAt": "2026-06-08T..."
  }
}
```

---

## Campaign Creation Example

```http
POST /admin/campaigns
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "name": "Summer Sale 2026",
  "type": "percent",
  "value": 15,
  "appliesTo": {
    "products": ["60d5f...", "60d5f..."],
    "categories": ["60d5f..."],
    "brands": []
  },
  "startDate": "2026-06-01T00:00:00Z",
  "endDate": "2026-08-31T23:59:59Z",
  "isActive": true
}
```

---

## Error Response Format

All errors follow this structure:

```json
{
  "success": false,
  "message": "Error message here",
  "data": null
}
```

### Common Status Codes
- `200` — Success
- `201` — Created
- `400` — Bad Request (validation error)
- `401` — Unauthorized (missing or invalid token)
- `403` — Forbidden (insufficient permissions)
- `404` — Not Found
- `413` — Payload Too Large (file size exceeded)
- `500` — Internal Server Error

---

## Pagination Format

Paginated responses include:

```json
{
  "success": true,
  "message": "Data fetched.",
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8
  }
}
```

---

## Notes

1. **Refresh Token:** Stored as httpOnly cookie, never exposed to client JavaScript
2. **Access Token:** Short-lived (1h), sent in Authorization header
3. **File Uploads:** Max 5MB, only JPEG/PNG/WebP allowed
4. **Inquiry WhatsApp Message:** Auto-generated from items, includes product names and SKUs
5. **Campaign Active Lookup:** Filters by product, category, OR brand + active status + endDate > now
6. **Media Delete Safety:** Cloudinary delete MUST succeed before DB deletion
7. **Notifications:** Limited to 50 most recent per user
8. **Audit Logs:** All admin mutations create audit records (fire-and-forget)

---

**Last Updated:** June 8, 2026  
**Backend Version:** BTG v4  
**Session:** SESSION_04_SERVICES
