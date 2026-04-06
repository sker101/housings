-- ============================================================
-- CampusStay TZ — Redesign V2 Schema
-- Adds new columns, tables, and RLS policies for the full
-- tenant / landlord / dalali / admin role architecture.
-- All statements are idempotent (if not exists / add column if not exists).
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. Extend profiles table
-- ─────────────────────────────────────────────
alter table profiles add column if not exists occupation text;
alter table profiles add column if not exists id_verified boolean default false;
alter table profiles add column if not exists id_document_url text;
alter table profiles add column if not exists suspended boolean default false;
alter table profiles add column if not exists avg_rating numeric default 0;

-- Migrate is_suspended → suspended (keep both for backward compat)
update profiles set suspended = is_suspended where is_suspended is not null and suspended = false;

-- ─────────────────────────────────────────────
-- 2. Extend listings table
-- ─────────────────────────────────────────────
alter table listings add column if not exists owner_role text check (owner_role in ('landlord','dalali'));
alter table listings add column if not exists lat numeric;
alter table listings add column if not exists lng numeric;
alter table listings add column if not exists amenities text[] default '{}';
alter table listings add column if not exists views integer default 0;
alter table listings add column if not exists area text;

-- ─────────────────────────────────────────────
-- 3. Create subscriptions table
-- ─────────────────────────────────────────────
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  plan text not null,
  status text default 'active' check (status in ('active','cancelled','past_due')),
  current_period_end timestamptz,
  selcom_ref text,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────
-- 4. Create activity_log table
-- ─────────────────────────────────────────────
create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  event_type text not null,
  description text,
  metadata jsonb,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────
-- 5. RLS — profiles
-- ─────────────────────────────────────────────
alter table profiles enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'profiles' and policyname = 'Users read own profile'
  ) then
    create policy "Users read own profile" on profiles for select using (auth.uid() = id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'profiles' and policyname = 'Users update own profile'
  ) then
    create policy "Users update own profile" on profiles for update using (auth.uid() = id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'profiles' and policyname = 'Admin reads all profiles'
  ) then
    create policy "Admin reads all profiles" on profiles for all using ((auth.jwt() ->> 'role') = 'admin');
  end if;
end $$;

-- ─────────────────────────────────────────────
-- 6. RLS — listings (add new policies if missing)
-- ─────────────────────────────────────────────
alter table listings enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'listings' and policyname = 'Admin manages all listings'
  ) then
    create policy "Admin manages all listings" on listings for all using ((auth.jwt() ->> 'role') = 'admin');
  end if;
end $$;

-- ─────────────────────────────────────────────
-- 7. RLS — subscriptions
-- ─────────────────────────────────────────────
alter table subscriptions enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'subscriptions' and policyname = 'User sees own subscription'
  ) then
    create policy "User sees own subscription" on subscriptions for select using (user_id = auth.uid());
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'subscriptions' and policyname = 'Admin manages all subscriptions'
  ) then
    create policy "Admin manages all subscriptions" on subscriptions for all using ((auth.jwt() ->> 'role') = 'admin');
  end if;
end $$;

-- ─────────────────────────────────────────────
-- 8. RLS — activity_log
-- ─────────────────────────────────────────────
alter table activity_log enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'activity_log' and policyname = 'User reads own activity'
  ) then
    create policy "User reads own activity" on activity_log for select using (user_id = auth.uid());
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'activity_log' and policyname = 'User inserts own activity'
  ) then
    create policy "User inserts own activity" on activity_log for insert with check (user_id = auth.uid());
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'activity_log' and policyname = 'Admin reads all activity'
  ) then
    create policy "Admin reads all activity" on activity_log for all using ((auth.jwt() ->> 'role') = 'admin');
  end if;
end $$;

-- ─────────────────────────────────────────────
-- 9. Enable realtime on activity_log
-- ─────────────────────────────────────────────
alter publication supabase_realtime add table activity_log;
