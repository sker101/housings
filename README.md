# CampusStay TZ

CampusStay TZ is a verified student housing platform focused on Dar es Salaam.

V1 university scope:
- University of Dar es Salaam (UDSM)

The platform enforces trust-first workflows:
- Listings are private until admin approval
- Landlords can submit listings; status stays pending until admin approval
- Verified badge for approved listings
- Admin moderation controls for listings and landlords

## Tech Stack
- Backend: Spring Boot, PostgreSQL, Flyway, JWT, BCrypt
- Frontend: React (Vite), mobile-first UI
- Deployment: Docker + Docker Compose
- Production DB option: Supabase PostgreSQL

## Repo Structure
- `/Users/macbookair/Documents/New project/backend` - Spring Boot API
- `/Users/macbookair/Documents/New project/frontend` - React web app
- `/Users/macbookair/Documents/New project/docker-compose.yml` - Full stack orchestration

## Environment Setup
From project root:
```bash
cd "/Users/macbookair/Documents/New project"
cp .env.example .env
```

### Mode A: Local Testing (default)
Use defaults in `.env`:
```env
DB_URL=jdbc:postgresql://postgres:5432/campusstay
DB_USERNAME=campusstay
DB_PASSWORD=campusstay
DB_SSLMODE=disable
BOOTSTRAP_SEED_DEMO_DATA=true
CORS_ALLOWED_ORIGINS=http://localhost:3000
APP_AI_ENABLED=true
OPENAI_API_KEY=your-openai-key
```

This runs a local Postgres container and seeds:
- Admin account
- Demo approved landlord
- Demo verified listings

### Mode B: Production (Supabase)
Override only DB and environment-specific values in `.env`:
```env
DB_URL=jdbc:postgresql://db.YOUR_PROJECT_REF.supabase.co:5432/postgres?sslmode=require
DB_USERNAME=postgres.YOUR_PROJECT_REF
DB_PASSWORD=YOUR_SUPABASE_DB_PASSWORD
DB_SSLMODE=require
BOOTSTRAP_SEED_DEMO_DATA=false
CORS_ALLOWED_ORIGINS=https://your-frontend-domain.com
APP_AI_ENABLED=true
OPENAI_API_KEY=your-openai-key
```

## Start the Site
```bash
docker compose up -d --build
```

Check status:
```bash
docker compose ps
```

## Access URLs
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8081/api/v1`
- Backend health: `http://localhost:8081/actuator/health`

## Login and Account Flows

### Seeded admin account
- Email: `admin@campusstay.co.tz`
- Password: `ChangeMe123!`

### Seeded demo landlord account (testing mode)
- Email: `demo.landlord@campusstay.co.tz`
- Password: `ChangeMe123!`

### Student flow
1. Register: `http://localhost:3000/register/student`
2. Login: `http://localhost:3000/login`
3. Search rooms on home page
4. Open details: `/rooms/:roomId`
5. Room details page renders clean sections (overview, amenities, location, house rules, photo checklist) from structured metadata and hides internal onboarding fields

### Landlord flow
1. Register: `http://localhost:3000/register/landlord`
2. Login: `http://localhost:3000/login`
3. Go to landlord dashboard: `http://localhost:3000/landlord`
4. List property page: `http://localhost:3000/list-property`
5. Complete the 4-step wizard:
   - Basics
   - Location & Price
   - Photos (file upload + AI photo-angle checks)
   - Review
6. Submit listing (status starts as pending review)
7. Wait for admin approval before listing appears publicly
8. Uploaded listing photos (bedroom, kitchen, bathroom, outside) are stored and shown in a scrollable gallery on room details pages

List-property wizard supports lister account roles:
- Property Owner (Landlord)
- Property Manager
- Dalali (Agent/Broker)

The wizard now collects:
- Account/identity verification fields (full legal name, phone/email, profile photo upload, ID/passport upload, selfie upload)
- Account-type specific compliance documents
- Owner physical property address through region + location dropdown (with custom fallback)
- Owner payout setup through bank/provider dropdown + account/wallet reference
- Detailed property metadata (location hierarchy via dependent dropdowns for region/district/ward/street, map pin with current-location capture, pricing, utilities, house rules, gender preference)
- Photo requirements with fixed required uploads (exactly 4: bedroom, kitchen, bathroom, outside view)
- AI verification runs automatically on submission for required photo angles (JPG/PNG/WEBP, confidence-gated)
- If AI service is unavailable, submission still proceeds to admin/manual review; only confirmed AI mismatches block submission
- After listing metadata is created, required room photos are uploaded to backend storage and served through public photo URLs
- Auto-saved listing draft (step + non-file fields) in browser local storage to avoid retyping when navigating back/forward or refreshing
- Note: browsers do not persist file uploads for security, so images/documents may need re-upload after refresh
- Listing description payload stores only public-facing property metadata; identity and payout onboarding data is not embedded in public listing details
- Submit button always shows actionable blocking reason in-page (e.g., landlord verification still pending)
- Mandatory policy acceptance before submission

### Admin flow
1. Login with admin account at `http://localhost:3000/login`
2. Open admin panel: `http://localhost:3000/admin`
3. Approve/reject/suspend landlords
4. Approve/reject/flag/unflag listings

## Core Endpoints
Base path: `/api/v1`

Auth:
- `POST /auth/register/student`
- `POST /auth/register/landlord`
- `POST /auth/login`

Public listings:
- `GET /public/listings`
- `GET /public/listings/{listingId}`
- `GET /public/listings/{listingId}/photos/{photoId}`

Landlord:
- `GET /landlord/profile`
- `GET /landlord/listings/mine`
- `POST /landlord/listings`
- `POST /landlord/listings/{listingId}/photos` (multipart form: `file`, `angle`)
- `PUT /landlord/listings/{listingId}`
- `POST /landlord/listings/photos/inspect` (multipart form: `file`, `expectedAngle`)

Admin:
- `GET /admin/dashboard/metrics`
- `GET /admin/landlords/pending`
- `POST /admin/landlords/{landlordUserId}/approve`
- `POST /admin/landlords/{landlordUserId}/reject`
- `POST /admin/landlords/{landlordUserId}/suspend`
- `GET /admin/listings/pending`
- `GET /admin/listings/flagged`
- `POST /admin/listings/{listingId}/approve`
- `POST /admin/listings/{listingId}/reject`
- `POST /admin/listings/{listingId}/flag`
- `POST /admin/listings/{listingId}/unflag`

Current user:
- `GET /users/me`

## Security Controls
- BCrypt password hashing
- JWT-based stateless auth
- Role-based route protection (`ADMIN`, `LANDLORD`, `STUDENT`)
- Input validation
- Duplicate listing checks
- Owner-only listing edits
- Global error handling with server-side error logging
- Configurable CORS allowed origins
- AI-backed photo angle verification before listing submission

## Monetization-Ready Data Model
Listing fields include:
- `featured`
- `promotionLevel`
- `promotionExpiresAt`
- `commissionTrackingStatus`
- `commissionAmount`

Landlord profile includes:
- `subscriptionPlan`
- `commissionRatePercent`

## Troubleshooting

### Site not reachable
```bash
docker compose ps
docker compose logs frontend --tail=200
docker compose logs backend --tail=200
```

### Backend cannot connect to DB
- Verify `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`
- If Supabase: use direct Postgres URL on `5432` and `DB_SSLMODE=require`

### Login returns unexpected error
```bash
docker compose logs backend --tail=300
```
Then rebuild backend:
```bash
docker compose up -d --build backend
```

### AI photo check returns error
- Confirm `OPENAI_API_KEY` is set in `/Users/macbookair/Documents/New project/.env`
- Restart backend after env changes:
```bash
docker compose up -d --build backend
```
- Use JPG, PNG, or WEBP images only for AI checks

### Reset local environment
```bash
docker compose down -v
docker compose up -d --build
```

## Local Development (without Docker)
Backend:
```bash
cd "/Users/macbookair/Documents/New project/backend"
mvn spring-boot:run
```

Frontend:
```bash
cd "/Users/macbookair/Documents/New project/frontend"
npm install
npm run dev
```

Optional frontend dev proxy target:
```bash
export VITE_DEV_API_PROXY_TARGET=http://localhost:8081
```

## Production Readiness Checklist
Before go-live:
1. Set strong `JWT_SECRET`.
2. Change bootstrap admin password.
3. Set `BOOTSTRAP_SEED_DEMO_DATA=false`.
4. Set exact production domain in `CORS_ALLOWED_ORIGINS`.
5. Configure real Supabase credentials.
6. Set `OPENAI_API_KEY` and validate AI photo checks in production.
7. Enable monitoring/log aggregation and backups.

## README Update Policy
This README is operational documentation and must be updated in the same change whenever any of these change:
- API routes or request/response behavior
- Auth/role rules
- DB schema or migrations
- Environment variables
- Startup commands or ports
- User-facing routes/workflows

##try these logins for trial
username: georgekenneth1010@gmail.com
passwd: george123
