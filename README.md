# CampusStay TZ

CampusStay TZ is now running as a Supabase-first React app aligned to the redesign specification in `campusstay-redesign.html`.

## Current Direction
- Frontend: React + Vite + TypeScript (`frontend/`)
- Tooling: ESLint + `jsx-a11y` + TypeScript casting/interfaces
- Backend for active product flow: Supabase Auth, PostgREST, Storage, Edge Functions
- Legacy Spring backend (`backend/`) remains in the repo but is not required for the redesign cutover path

## Implemented Redesign Scope (V1 Core)
- Role-based auth with Supabase session persistence
- Public home/search/listing detail flow
- Saved listings
- Inquiry creation from listing detail to conversation + chat thread
- Shared messages page for tenant/lister
- Lister 5-step listing wizard with cloud draft autosave
- AI photo inspection hook via Edge Function (`inspect-photo`)
- Lister dashboard with listing + inquiry/message metrics
- Admin dashboard, landlord queue, listing queue, audit log
- Warm redesign visual system (Syne + DM Sans, ink/paper/jade palette, mobile bottom nav)

## Git Workflow & Auto-Deployment

**Production Deployment (Vercel Auto-Deploy)**
- All work is committed directly to `main` branch ↓
- GitHub webhook triggers Vercel build automatically
- Vercel compiles frontend and deploys to production
- Live in ~3-5 minutes after push

**Process for Every Code Change:**
1. Make changes locally
2. `git add -A && git commit -m "..."` 
3. `git push origin main`
4. Wait 3-5 minutes for Vercel build
5. Check deployment at https://campusstay-deploy.vercel.app (or your Vercel URL)

## Required Environment
Create `frontend/.env` from `frontend/.env.example`:

```env
VITE_SUPABASE_PROJECT_REF=iavflytaqfdwhmshocvm
VITE_SUPABASE_URL=https://iavflytaqfdwhmshocvm.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Run Frontend
```bash
cd frontend
npm install
npm run dev
```

Build check:
```bash
npm run build
```

## Seed Test Data
From project root:
```bash
SERVICE_KEY=$(supabase projects api-keys --project-ref iavflytaqfdwhmshocvm -o json | node -e 'let d=\"\";process.stdin.on(\"data\",c=>d+=c);process.stdin.on(\"end\",()=>{const j=JSON.parse(d);const k=j.find(x=>x.id===\"service_role\")?.api_key||\"\";process.stdout.write(k);});')
SUPABASE_URL=https://iavflytaqfdwhmshocvm.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=\"$SERVICE_KEY\" \
node scripts/seed_supabase.mjs
```

Seed script:
- `scripts/seed_supabase.mjs`

## Primary Routes
- `/` Home
- `/search`
- `/rooms/:roomId`
- `/messages`, `/messages/:threadId`
- `/saved`
- `/profile`
- `/list-property`
- `/landlord`
- `/admin`
- `/admin/landlords`
- `/admin/listings`
- `/admin/audit-log`
- `/login`
- `/register/student`
- `/register/landlord`

## Supabase Tables Used
- `profiles`
- `listings`
- `listing_photos`
- `listing_drafts`
- `saved_listings`
- `conversations`
- `messages`
- `admin_audit_log`

## Supabase Ops (CLI)
Project is linked to `iavflytaqfdwhmshocvm`.

Common commands:
```bash
# Validate and apply migrations
supabase db push --linked --dry-run
supabase db push --linked

# Deploy edge functions
supabase functions deploy inspect-photo --project-ref iavflytaqfdwhmshocvm
supabase functions deploy admin-action --project-ref iavflytaqfdwhmshocvm
supabase functions deploy increment-view --project-ref iavflytaqfdwhmshocvm
supabase functions deploy verify-phone-otp --project-ref iavflytaqfdwhmshocvm
supabase functions deploy submit-listing --project-ref iavflytaqfdwhmshocvm

# Verify deployed functions
supabase functions list --project-ref iavflytaqfdwhmshocvm
```

Migration added:
- `supabase/migrations/20260227144457_redesign_core_schema.sql`
- `supabase/migrations/20260227151941_remote_schema.sql` (no-op history alignment file from `db pull`)
- `supabase/migrations/20260227152856_auth_trigger_role_defaults.sql`

Edge functions added:
- `supabase/functions/inspect-photo`
- `supabase/functions/admin-action`
- `supabase/functions/increment-view`
- `supabase/functions/verify-phone-otp`
- `supabase/functions/submit-listing`

## Edge Functions Expected
- `inspect-photo`
- `verify-phone-otp`
- `increment-view`
- `admin-action`
- `submit-listing`

## Implemented Features (Beyond V1 Core)
- ✅ **Search pagination** — infinite scroll with IntersectionObserver, 24-per-page
- ✅ **TypeScript Migration** — Fully typed Supabase client, interfaces for all context providers, and 0 compiler errors.
- ✅ **Accessibility (a11y)** — Resolved violations in key components (modals, maps, images) using semantic HTML and custom keyboard listeners.
- ✅ **Expanded Room Options** — Tanzania-specific housing types (Self-Contained, SQ, Guesthouse, etc.) implemented across wizard and search filters.
- ✅ **Reviews & ratings** — star rating UI, review cards, write/edit review form on listing detail
- ✅ **Booking flow** — booking request creation from inquiry with duration, status tracking on listing detail
- ✅ **Map** — Leaflet bundled via npm (no CDN dependency), dynamic import with fallback
- ✅ **Lister verification enforcement** — unverified listers can draft but not submit; status banner on wizard
- ✅ **Location picker** — geolocation button + district/ward dropdowns (Dar es Salaam hierarchy)
- ✅ **Admin moderation polish** — bulk workflows with templated rejection/suspension reasons and custom modal UI

## Remaining Gaps to Reach Full Production
- **TypeScript Strictness**: Currently in `strict: false` mode to facilitate migration; needs incremental move to `strict: true`.
- **Production SMS Gateway**: Integration for Tanzanian carriers required (currently returns fixed dev codes).
- **Payment Gateway**: Integration (e.g., Pesapal, Selcom) for booking payments.
- **Push Notifications**: Real-time browser notifications for new messages/bookings.
- **End-to-End Tests**: Browser automation tests for the main submission/booking flows.

## Notes
- Keep `campusstay-redesign.html` unchanged; it is the reference specification.
- If RLS policies are strict, ensure anon/authenticated policies match the route behavior above.

