# Standard Operating Procedure

## Local Setup

### Prerequisites
- Node.js 20+
- MongoDB (local or Atlas)
- Cloudinary account

### Frontend
```bash
cd frontend
cp .env.example .env
# Set VITE_API_URL=http://localhost:3000/api/v1
npm install
npm run dev
```

### Backend
```bash
cd backend
cp .env.example .env
# Fill in all required env variables
npm install
npm run dev
```

## Seeding
TBD — see scripts/ folder.
