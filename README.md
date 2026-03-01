# CampusStay TZ

CampusStay TZ is now running as a Supabase-first React app aligned to the redesign specification in `campusstay-redesign.html`.

## Current Direction
- Frontend: React + Vite (`frontend/`)
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
- ✅ **Reviews & ratings** — star rating UI, review cards, write/edit review form on listing detail
- ✅ **Booking flow** — booking request creation from inquiry with duration, status tracking on listing detail
- ✅ **Map** — Leaflet bundled via npm (no CDN dependency), dynamic import with fallback
- ✅ **Lister verification enforcement** — unverified listers can draft but not submit; status banner on wizard
- ✅ **Location picker** — geolocation button + district/ward dropdowns (Dar es Salaam hierarchy)

## Remaining Gaps to Reach Full Production
- SMS gateway integration for production OTP delivery (current RPC returns dev OTP code for test environments)
- Full payment processing UI (data layer exists; needs payment gateway integration)
- Global notification center / push notifications
- Full admin bulk workflow polish and reason-template UX hardening
- Automated test framework (Vitest recommended)

## Notes
- Keep `campusstay-redesign.html` unchanged; it is the reference specification.
- If RLS policies are strict, ensure anon/authenticated policies match the route behavior above.

