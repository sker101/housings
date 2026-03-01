begin;

-- ─────────────────────────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────────────────────────

do $$ begin
  create type public.listing_check_type as enum (
    'duplicate_photo', 'price_anomaly', 'text_pattern',
    'address_duplicate', 'ai_mismatch', 'verification_gate'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.check_result as enum ('pass', 'warn', 'block');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.check_severity as enum ('critical', 'high', 'medium', 'low');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.report_reason as enum (
    'fraud', 'photos_mismatch', 'misleading_price',
    'unsafe', 'harassment', 'already_rented', 'unconducive'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.report_status as enum ('pending', 'upheld', 'dismissed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.claim_status as enum ('pending', 'upheld', 'dismissed', 'disputed');
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────────────────────────
-- LISTING CHECKS
-- Stores the results of every automated check run on a listing
-- ─────────────────────────────────────────────────────────────────

create table if not exists public.listing_checks (
  id            uuid primary key default gen_random_uuid(),
  listing_id    uuid not null references public.listings (id) on delete cascade,
  check_type    public.listing_check_type not null,
  result        public.check_result not null,
  severity      public.check_severity not null,
  detail        text,                          -- Human-readable message shown to landlord
  metadata      jsonb default '{}',            -- Raw results (confidence scores, etc.)
  checked_at    timestamptz not null default now()
);

create index if not exists idx_listing_checks_listing on public.listing_checks (listing_id, checked_at desc);
create index if not exists idx_listing_checks_result on public.listing_checks (result, severity);

-- ─────────────────────────────────────────────────────────────────
-- LISTING REPORTS
-- Guest reports submitted by tenants or anonymous users
-- ─────────────────────────────────────────────────────────────────

create table if not exists public.listing_reports (
  id                      uuid primary key default gen_random_uuid(),
  listing_id              uuid not null references public.listings (id) on delete cascade,
  reporter_id             uuid references public.profiles (id) on delete set null, -- nullable = anonymous
  reason                  public.report_reason not null,
  description             text,
  evidence_urls           text[] default '{}',
  reporter_has_booking    boolean not null default false,
  status                  public.report_status not null default 'pending',
  admin_note              text,
  created_at              timestamptz not null default now()
);

create index if not exists idx_listing_reports_listing on public.listing_reports (listing_id, status, created_at desc);
create index if not exists idx_listing_reports_reporter on public.listing_reports (reporter_id, created_at desc);

-- ─────────────────────────────────────────────────────────────────
-- CAMPUSCOVER CLAIMS
-- Tenant protection claims submitted within 24h of move-in
-- ─────────────────────────────────────────────────────────────────

create table if not exists public.campuscover_claims (
  id              uuid primary key default gen_random_uuid(),
  booking_id      uuid not null references public.bookings (id) on delete cascade,
  tenant_id       uuid not null references public.profiles (id) on delete cascade,
  listing_id      uuid not null references public.listings (id) on delete cascade,
  description     text not null,
  evidence_urls   text[] default '{}',
  status          public.claim_status not null default 'pending',
  admin_decision  text,
  credit_issued   integer default 0,           -- TZS credit issued if upheld
  submitted_at    timestamptz not null default now()
);

create index if not exists idx_campuscover_claims_booking on public.campuscover_claims (booking_id);
create index if not exists idx_campuscover_claims_tenant on public.campuscover_claims (tenant_id, submitted_at desc);
create index if not exists idx_campuscover_claims_status on public.campuscover_claims (status, submitted_at desc);

-- ─────────────────────────────────────────────────────────────────
-- UPGRADE REVIEWS TABLE
-- Add multi-dimensional star ratings as per the spec
-- ─────────────────────────────────────────────────────────────────

alter table public.reviews
  add column if not exists rating_accuracy      integer check (rating_accuracy between 1 and 5),
  add column if not exists rating_cleanliness   integer check (rating_cleanliness between 1 and 5),
  add column if not exists rating_communication integer check (rating_communication between 1 and 5),
  add column if not exists rating_location      integer check (rating_location between 1 and 5),
  add column if not exists rating_value         integer check (rating_value between 1 and 5),
  add column if not exists rating_safety        integer check (rating_safety between 1 and 5),
  add column if not exists landlord_reply       text,
  add column if not exists is_removed           boolean not null default false,
  add column if not exists removal_reason       text,
  add column if not exists body                 text;

-- ─────────────────────────────────────────────────────────────────
-- UPGRADE LISTINGS TABLE
-- Add screening_score and auto_approved tracking
-- ─────────────────────────────────────────────────────────────────

alter table public.listings
  add column if not exists screening_passed     boolean,
  add column if not exists auto_published_at    timestamptz,
  add column if not exists report_count         integer not null default 0,
  add column if not exists upheld_claims_count  integer not null default 0;

-- ─────────────────────────────────────────────────────────────────
-- UPGRADE PROFILES TABLE
-- Add landlord takedown history and trust score
-- ─────────────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists takedown_count       integer not null default 0,
  add column if not exists avg_rating           numeric(3,2) default null,
  add column if not exists trusted_host         boolean not null default false,
  add column if not exists is_suspended         boolean not null default false,
  add column if not exists suspension_reason    text;

-- ─────────────────────────────────────────────────────────────────
-- RLS POLICIES
-- ─────────────────────────────────────────────────────────────────

alter table public.listing_checks enable row level security;
alter table public.listing_reports enable row level security;
alter table public.campuscover_claims enable row level security;

-- Listing Checks: landlord can read their own listing checks
create policy "Lister can read own listing checks"
  on public.listing_checks for select
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_checks.listing_id
        and l.lister_id = auth.uid()
    )
  );

-- Listing Checks: admin can read all
create policy "Admin can read all listing checks"
  on public.listing_checks for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Listing Reports: anyone logged in can insert
create policy "Authenticated users can submit reports"
  on public.listing_reports for insert
  with check (auth.uid() is not null);

-- Listing Reports: reporter can read own reports
create policy "Reporter can read own reports"
  on public.listing_reports for select
  using (reporter_id = auth.uid());

-- Listing Reports: admin can read and update all reports
create policy "Admin can manage all reports"
  on public.listing_reports for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- CampusCover Claims: tenant can insert and read own claims
create policy "Tenant can submit and read own claims"
  on public.campuscover_claims for all
  using (tenant_id = auth.uid())
  with check (tenant_id = auth.uid());

-- CampusCover Claims: admin can manage all claims
create policy "Admin can manage all claims"
  on public.campuscover_claims for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ─────────────────────────────────────────────────────────────────
-- HELPER FUNCTIONS
-- ─────────────────────────────────────────────────────────────────

-- Function to recalculate and cache the aggregate rating for a listing
create or replace function public.refresh_listing_avg_rating(p_listing_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_avg numeric(3,2);
begin
  select round(avg(rating)::numeric, 2)
    into v_avg
  from public.reviews
  where listing_id = p_listing_id
    and is_hidden = false
    and is_removed = false;

  -- Auto-hide listings with very low ratings (min 5 reviews)
  if v_avg is not null and v_avg < 2.0 then
    update public.listings set vacancy_status = 'unavailable'
    where id = p_listing_id
      and (select count(*) from public.reviews where listing_id = p_listing_id and is_hidden = false) >= 5;
  end if;
end;
$$;

-- Trigger that calls the refresh after each review insert/update
create or replace function public.trigger_refresh_listing_rating()
returns trigger
language plpgsql
as $$
begin
  perform public.refresh_listing_avg_rating(coalesce(new.listing_id, old.listing_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists refresh_rating_on_review_change on public.reviews;
create trigger refresh_rating_on_review_change
after insert or update or delete on public.reviews
for each row execute function public.trigger_refresh_listing_rating();

-- Function to increment report count on a listing and auto-suspend if threshold met
create or replace function public.handle_listing_report_threshold()
returns trigger
language plpgsql
security definer
as $$
declare
  v_report_count integer;
  v_critical_report boolean;
begin
  -- Only act on newly inserted reports
  if TG_OP = 'INSERT' then
    -- Count verified reports
    select count(*) into v_report_count
      from public.listing_reports
    where listing_id = new.listing_id
      and reporter_id is not null
      and status = 'pending';

    -- Check if this is a critical reason (single verified report = takedown)
    v_critical_report := new.reason in ('fraud', 'unsafe', 'harassment') and new.reporter_id is not null;

    if v_critical_report or new.reporter_has_booking or v_report_count >= 3 then
      update public.listings
        set status = 'flagged',
            report_count = report_count + 1
      where id = new.listing_id;
    else
      update public.listings
        set report_count = report_count + 1
      where id = new.listing_id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trigger_listing_report_threshold on public.listing_reports;
create trigger trigger_listing_report_threshold
after insert on public.listing_reports
for each row execute function public.handle_listing_report_threshold();

commit;
