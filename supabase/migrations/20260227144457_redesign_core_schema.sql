begin;

create extension if not exists pgcrypto;
create extension if not exists pg_cron;

-- ----------
-- Enums
-- ----------
do $$
begin
  create type public.app_role as enum ('student', 'lister', 'admin');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.lister_type as enum ('owner', 'manager', 'dalali');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.verification_status as enum ('unverified', 'pending', 'verified', 'rejected', 'suspended');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.subscription_plan as enum ('free', 'verified', 'premium');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.room_type as enum ('single', 'shared', 'bedsit', 'studio', 'apartment');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.gender_preference as enum ('any', 'male', 'female');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.vacancy_status as enum ('available', 'occupied', 'coming_soon');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.listing_status as enum ('draft', 'pending', 'approved', 'rejected', 'flagged', 'suspended');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.listing_photo_angle as enum ('bedroom', 'kitchen', 'bathroom', 'outside');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.inquiry_status as enum ('open', 'interested', 'unavailable', 'booked');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.admin_action as enum (
    'approve_landlord',
    'reject_landlord',
    'approve_listing',
    'reject_listing',
    'flag',
    'unflag',
    'suspend'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.admin_target_type as enum ('landlord', 'listing');
exception
  when duplicate_object then null;
end $$;

-- ----------
-- Utility Functions
-- ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ----------
-- Core Tables
-- ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'student',
  lister_type public.lister_type,
  full_name text not null,
  phone text,
  phone_verified boolean not null default false,
  university text,
  profile_photo_url text,
  id_doc_url text,
  selfie_url text,
  verification_status public.verification_status not null default 'unverified',
  subscription_plan public.subscription_plan not null default 'free',
  commission_rate_pct numeric(5,2),
  payout_provider text,
  payout_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_phone_unique unique (phone)
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  lister_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text not null,
  room_type public.room_type not null,
  gender_preference public.gender_preference not null default 'any',
  price_monthly integer not null check (price_monthly >= 0),
  utilities_included boolean not null default false,
  region text not null,
  district text not null,
  ward text not null,
  street text not null,
  lat numeric(9,6),
  lng numeric(9,6),
  amenities jsonb not null default '{}'::jsonb,
  house_rules text,
  available_from date,
  vacancy_status public.vacancy_status not null default 'available',
  status public.listing_status not null default 'pending',
  rejection_reason text,
  featured boolean not null default false,
  promotion_level integer not null default 0,
  promotion_expires_at timestamptz,
  view_count integer not null default 0,
  near_universities text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.listing_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  angle public.listing_photo_angle not null,
  storage_path text not null,
  public_url text not null,
  ai_verified boolean,
  ai_confidence numeric(5,4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint listing_photos_unique_angle unique (listing_id, angle)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  tenant_id uuid not null references public.profiles (id) on delete cascade,
  lister_id uuid not null references public.profiles (id) on delete cascade,
  inquiry_status public.inquiry_status not null default 'open',
  move_in_date date,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversations_unique_listing_tenant unique (listing_id, tenant_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  seen_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.saved_listings (
  tenant_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (tenant_id, listing_id)
);

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles (id) on delete cascade,
  action public.admin_action not null,
  target_type public.admin_target_type not null,
  target_id uuid not null,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.listing_drafts (
  lister_id uuid primary key references public.profiles (id) on delete cascade,
  current_step integer not null default 1 check (current_step between 1 and 5),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.phone_verification_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  phone text not null,
  code text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin(target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = target_user_id
      and p.role = 'admin'
  );
$$;

create or replace function public.is_lister(target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = target_user_id
      and p.role in ('lister', 'admin')
  );
$$;

grant execute on function public.is_admin(uuid) to anon, authenticated, service_role;
grant execute on function public.is_lister(uuid) to anon, authenticated, service_role;

-- ----------
-- Indexes
-- ----------
create index if not exists idx_profiles_role on public.profiles (role);
create index if not exists idx_profiles_verification_status on public.profiles (verification_status);

create index if not exists idx_listings_lister on public.listings (lister_id);
create index if not exists idx_listings_status_created_at on public.listings (status, created_at desc);
create index if not exists idx_listings_featured on public.listings (featured);
create index if not exists idx_listings_price on public.listings (price_monthly);
create index if not exists idx_listings_location on public.listings (region, district, ward);
create index if not exists idx_listings_near_universities on public.listings using gin (near_universities);
create index if not exists idx_listings_amenities on public.listings using gin (amenities);

create index if not exists idx_listing_photos_listing on public.listing_photos (listing_id, created_at);

create index if not exists idx_conversations_listing on public.conversations (listing_id);
create index if not exists idx_conversations_tenant on public.conversations (tenant_id, last_message_at desc);
create index if not exists idx_conversations_lister on public.conversations (lister_id, last_message_at desc);

create index if not exists idx_messages_conversation_created on public.messages (conversation_id, created_at);
create index if not exists idx_messages_sender on public.messages (sender_id, created_at desc);
create index if not exists idx_messages_unseen on public.messages (conversation_id, seen_at) where seen_at is null;

create index if not exists idx_saved_listings_saved_at on public.saved_listings (tenant_id, saved_at desc);
create index if not exists idx_admin_audit_log_created on public.admin_audit_log (created_at desc);
create index if not exists idx_admin_audit_log_action on public.admin_audit_log (action, created_at desc);
create index if not exists idx_listing_drafts_updated on public.listing_drafts (updated_at desc);
create index if not exists idx_phone_verification_codes_lookup on public.phone_verification_codes (user_id, phone, created_at desc);

-- ----------
-- Triggers
-- ----------
drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_listings_updated_at on public.listings;
create trigger set_listings_updated_at
before update on public.listings
for each row execute function public.set_updated_at();

drop trigger if exists set_listing_photos_updated_at on public.listing_photos;
create trigger set_listing_photos_updated_at
before update on public.listing_photos
for each row execute function public.set_updated_at();

drop trigger if exists set_conversations_updated_at on public.conversations;
create trigger set_conversations_updated_at
before update on public.conversations
for each row execute function public.set_updated_at();

drop trigger if exists set_listing_drafts_updated_at on public.listing_drafts;
create trigger set_listing_drafts_updated_at
before update on public.listing_drafts
for each row execute function public.set_updated_at();

create or replace function public.touch_conversation_last_message()
returns trigger
language plpgsql
as $$
begin
  update public.conversations
  set last_message_at = now(),
      updated_at = now()
  where id = new.conversation_id;

  return new;
end;
$$;

drop trigger if exists touch_conversation_last_message on public.messages;
create trigger touch_conversation_last_message
after insert on public.messages
for each row execute function public.touch_conversation_last_message();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text := lower(coalesce(new.raw_user_meta_data ->> 'role', 'student'));
  resolved_role public.app_role := case
    when requested_role in ('admin') then 'admin'::public.app_role
    when requested_role in ('lister', 'landlord') then 'lister'::public.app_role
    else 'student'::public.app_role
  end;
  requested_lister_type text := lower(coalesce(new.raw_user_meta_data ->> 'lister_type', ''));
  resolved_lister_type public.lister_type := case
    when requested_lister_type = 'owner' then 'owner'::public.lister_type
    when requested_lister_type = 'manager' then 'manager'::public.lister_type
    when requested_lister_type = 'dalali' then 'dalali'::public.lister_type
    else null
  end;
begin
  insert into public.profiles (
    id,
    role,
    lister_type,
    full_name,
    phone,
    verification_status,
    created_at,
    updated_at
  )
  values (
    new.id,
    resolved_role,
    resolved_lister_type,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1), 'New User'),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    case when resolved_role = 'lister' then 'pending' else 'unverified' end,
    now(),
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- ----------
-- Realtime
-- ----------
alter table public.messages replica identity full;
alter table public.conversations replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'conversations'
  ) then
    alter publication supabase_realtime add table public.conversations;
  end if;
end $$;

-- ----------
-- RLS
-- ----------
alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.listing_photos enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.saved_listings enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.listing_drafts enable row level security;
alter table public.phone_verification_codes enable row level security;

-- profiles
 drop policy if exists "profiles_public_select" on public.profiles;
create policy "profiles_public_select"
on public.profiles
for select
using (true);

drop policy if exists "profiles_insert_self_or_admin" on public.profiles;
create policy "profiles_insert_self_or_admin"
on public.profiles
for insert
with check (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists "profiles_update_self_or_admin" on public.profiles;
create policy "profiles_update_self_or_admin"
on public.profiles
for update
using (auth.uid() = id or public.is_admin(auth.uid()))
with check (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists "profiles_delete_admin" on public.profiles;
create policy "profiles_delete_admin"
on public.profiles
for delete
using (public.is_admin(auth.uid()));

-- listings
drop policy if exists "listings_select_by_visibility" on public.listings;
create policy "listings_select_by_visibility"
on public.listings
for select
using (
  status = 'approved'
  or lister_id = auth.uid()
  or public.is_admin(auth.uid())
);

drop policy if exists "listings_insert_lister_or_admin" on public.listings;
create policy "listings_insert_lister_or_admin"
on public.listings
for insert
with check (
  auth.uid() = lister_id
  and (public.is_lister(auth.uid()) or public.is_admin(auth.uid()))
);

drop policy if exists "listings_update_owner_or_admin" on public.listings;
create policy "listings_update_owner_or_admin"
on public.listings
for update
using (lister_id = auth.uid() or public.is_admin(auth.uid()))
with check (lister_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "listings_delete_owner_or_admin" on public.listings;
create policy "listings_delete_owner_or_admin"
on public.listings
for delete
using (lister_id = auth.uid() or public.is_admin(auth.uid()));

-- listing_photos
drop policy if exists "listing_photos_select_by_listing_visibility" on public.listing_photos;
create policy "listing_photos_select_by_listing_visibility"
on public.listing_photos
for select
using (
  exists (
    select 1
    from public.listings l
    where l.id = listing_id
      and (
        l.status = 'approved'
        or l.lister_id = auth.uid()
        or public.is_admin(auth.uid())
      )
  )
);

drop policy if exists "listing_photos_insert_owner_or_admin" on public.listing_photos;
create policy "listing_photos_insert_owner_or_admin"
on public.listing_photos
for insert
with check (
  exists (
    select 1
    from public.listings l
    where l.id = listing_id
      and (l.lister_id = auth.uid() or public.is_admin(auth.uid()))
  )
);

drop policy if exists "listing_photos_update_owner_or_admin" on public.listing_photos;
create policy "listing_photos_update_owner_or_admin"
on public.listing_photos
for update
using (
  exists (
    select 1
    from public.listings l
    where l.id = listing_id
      and (l.lister_id = auth.uid() or public.is_admin(auth.uid()))
  )
)
with check (
  exists (
    select 1
    from public.listings l
    where l.id = listing_id
      and (l.lister_id = auth.uid() or public.is_admin(auth.uid()))
  )
);

drop policy if exists "listing_photos_delete_owner_or_admin" on public.listing_photos;
create policy "listing_photos_delete_owner_or_admin"
on public.listing_photos
for delete
using (
  exists (
    select 1
    from public.listings l
    where l.id = listing_id
      and (l.lister_id = auth.uid() or public.is_admin(auth.uid()))
  )
);

-- conversations
drop policy if exists "conversations_select_participants_or_admin" on public.conversations;
create policy "conversations_select_participants_or_admin"
on public.conversations
for select
using (
  tenant_id = auth.uid()
  or lister_id = auth.uid()
  or public.is_admin(auth.uid())
);

drop policy if exists "conversations_insert_tenant_or_admin" on public.conversations;
create policy "conversations_insert_tenant_or_admin"
on public.conversations
for insert
with check (
  (
    tenant_id = auth.uid()
    and exists (
      select 1
      from public.listings l
      where l.id = listing_id
        and l.lister_id = conversations.lister_id
    )
  )
  or public.is_admin(auth.uid())
);

drop policy if exists "conversations_update_participants_or_admin" on public.conversations;
create policy "conversations_update_participants_or_admin"
on public.conversations
for update
using (
  tenant_id = auth.uid()
  or lister_id = auth.uid()
  or public.is_admin(auth.uid())
)
with check (
  tenant_id = auth.uid()
  or lister_id = auth.uid()
  or public.is_admin(auth.uid())
);

drop policy if exists "conversations_delete_participants_or_admin" on public.conversations;
create policy "conversations_delete_participants_or_admin"
on public.conversations
for delete
using (
  tenant_id = auth.uid()
  or lister_id = auth.uid()
  or public.is_admin(auth.uid())
);

-- messages
drop policy if exists "messages_select_conversation_participants_or_admin" on public.messages;
create policy "messages_select_conversation_participants_or_admin"
on public.messages
for select
using (
  exists (
    select 1
    from public.conversations c
    where c.id = conversation_id
      and (
        c.tenant_id = auth.uid()
        or c.lister_id = auth.uid()
        or public.is_admin(auth.uid())
      )
  )
);

drop policy if exists "messages_insert_sender_participant_or_admin" on public.messages;
create policy "messages_insert_sender_participant_or_admin"
on public.messages
for insert
with check (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.conversations c
    where c.id = conversation_id
      and (
        c.tenant_id = auth.uid()
        or c.lister_id = auth.uid()
        or public.is_admin(auth.uid())
      )
  )
);

drop policy if exists "messages_update_participants_or_admin" on public.messages;
create policy "messages_update_participants_or_admin"
on public.messages
for update
using (
  exists (
    select 1
    from public.conversations c
    where c.id = conversation_id
      and (
        c.tenant_id = auth.uid()
        or c.lister_id = auth.uid()
        or public.is_admin(auth.uid())
      )
  )
)
with check (
  exists (
    select 1
    from public.conversations c
    where c.id = conversation_id
      and (
        c.tenant_id = auth.uid()
        or c.lister_id = auth.uid()
        or public.is_admin(auth.uid())
      )
  )
);

drop policy if exists "messages_delete_admin_only" on public.messages;
create policy "messages_delete_admin_only"
on public.messages
for delete
using (public.is_admin(auth.uid()));

-- saved_listings
drop policy if exists "saved_listings_select_owner_or_admin" on public.saved_listings;
create policy "saved_listings_select_owner_or_admin"
on public.saved_listings
for select
using (tenant_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "saved_listings_insert_owner_or_admin" on public.saved_listings;
create policy "saved_listings_insert_owner_or_admin"
on public.saved_listings
for insert
with check (tenant_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "saved_listings_delete_owner_or_admin" on public.saved_listings;
create policy "saved_listings_delete_owner_or_admin"
on public.saved_listings
for delete
using (tenant_id = auth.uid() or public.is_admin(auth.uid()));

-- admin_audit_log
drop policy if exists "admin_audit_log_select_admin" on public.admin_audit_log;
create policy "admin_audit_log_select_admin"
on public.admin_audit_log
for select
using (public.is_admin(auth.uid()));

drop policy if exists "admin_audit_log_insert_admin" on public.admin_audit_log;
create policy "admin_audit_log_insert_admin"
on public.admin_audit_log
for insert
with check (public.is_admin(auth.uid()) and admin_id = auth.uid());

-- listing_drafts
drop policy if exists "listing_drafts_select_owner_or_admin" on public.listing_drafts;
create policy "listing_drafts_select_owner_or_admin"
on public.listing_drafts
for select
using (lister_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "listing_drafts_insert_owner_or_admin" on public.listing_drafts;
create policy "listing_drafts_insert_owner_or_admin"
on public.listing_drafts
for insert
with check (lister_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "listing_drafts_update_owner_or_admin" on public.listing_drafts;
create policy "listing_drafts_update_owner_or_admin"
on public.listing_drafts
for update
using (lister_id = auth.uid() or public.is_admin(auth.uid()))
with check (lister_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "listing_drafts_delete_owner_or_admin" on public.listing_drafts;
create policy "listing_drafts_delete_owner_or_admin"
on public.listing_drafts
for delete
using (lister_id = auth.uid() or public.is_admin(auth.uid()));

-- phone_verification_codes
drop policy if exists "phone_codes_select_owner_or_admin" on public.phone_verification_codes;
create policy "phone_codes_select_owner_or_admin"
on public.phone_verification_codes
for select
using (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "phone_codes_insert_owner_or_admin" on public.phone_verification_codes;
create policy "phone_codes_insert_owner_or_admin"
on public.phone_verification_codes
for insert
with check (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "phone_codes_update_owner_or_admin" on public.phone_verification_codes;
create policy "phone_codes_update_owner_or_admin"
on public.phone_verification_codes
for update
using (user_id = auth.uid() or public.is_admin(auth.uid()))
with check (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "phone_codes_delete_owner_or_admin" on public.phone_verification_codes;
create policy "phone_codes_delete_owner_or_admin"
on public.phone_verification_codes
for delete
using (user_id = auth.uid() or public.is_admin(auth.uid()));

-- ----------
-- Storage Buckets + Policies
-- ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-photos',
  'listing-photos',
  true,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'identity-docs',
  'identity-docs',
  false,
  52428800,
  array['image/jpeg', 'image/png', 'application/pdf']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view listing photos" on storage.objects;
create policy "Public can view listing photos"
on storage.objects
for select
to public
using (bucket_id = 'listing-photos');

drop policy if exists "Authenticated can upload listing photos" on storage.objects;
create policy "Authenticated can upload listing photos"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'listing-photos' and auth.uid() is not null);

drop policy if exists "Owners or admins can update listing photos" on storage.objects;
create policy "Owners or admins can update listing photos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'listing-photos'
  and (owner_id = auth.uid()::text or public.is_admin(auth.uid()))
)
with check (
  bucket_id = 'listing-photos'
  and (owner_id = auth.uid()::text or public.is_admin(auth.uid()))
);

drop policy if exists "Owners or admins can delete listing photos" on storage.objects;
create policy "Owners or admins can delete listing photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'listing-photos'
  and (owner_id = auth.uid()::text or public.is_admin(auth.uid()))
);

drop policy if exists "Owners or admins can read identity docs" on storage.objects;
create policy "Owners or admins can read identity docs"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'identity-docs'
  and (owner_id = auth.uid()::text or public.is_admin(auth.uid()))
);

drop policy if exists "Authenticated can upload identity docs" on storage.objects;
create policy "Authenticated can upload identity docs"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'identity-docs' and auth.uid() is not null);

drop policy if exists "Owners or admins can update identity docs" on storage.objects;
create policy "Owners or admins can update identity docs"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'identity-docs'
  and (owner_id = auth.uid()::text or public.is_admin(auth.uid()))
)
with check (
  bucket_id = 'identity-docs'
  and (owner_id = auth.uid()::text or public.is_admin(auth.uid()))
);

drop policy if exists "Owners or admins can delete identity docs" on storage.objects;
create policy "Owners or admins can delete identity docs"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'identity-docs'
  and (owner_id = auth.uid()::text or public.is_admin(auth.uid()))
);

-- ----------
-- RPC + Server Logic
-- ----------
create or replace function public.increment_listing_view(p_listing_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  next_count bigint;
begin
  update public.listings
  set view_count = view_count + 1,
      updated_at = now()
  where id = p_listing_id
    and status = 'approved'
  returning view_count into next_count;

  return coalesce(next_count, 0);
end;
$$;

grant execute on function public.increment_listing_view(uuid) to anon, authenticated, service_role;

create or replace function public.request_phone_otp(p_phone text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  normalized_phone text;
  generated_code text;
begin
  if actor is null then
    raise exception 'Authentication required';
  end if;

  normalized_phone := regexp_replace(coalesce(trim(p_phone), ''), '\\s+', '', 'g');

  if char_length(normalized_phone) < 9 then
    raise exception 'Invalid phone number';
  end if;

  generated_code := lpad((floor(random() * 1000000)::int)::text, 6, '0');

  insert into public.phone_verification_codes (user_id, phone, code, expires_at)
  values (actor, normalized_phone, generated_code, now() + interval '10 minutes');

  return jsonb_build_object(
    'sent', true,
    'expires_in_seconds', 600,
    -- Returned to simplify early integration. Remove in strict production mode.
    'code', generated_code
  );
end;
$$;

grant execute on function public.request_phone_otp(text) to authenticated, service_role;

create or replace function public.verify_phone_otp(p_phone text, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  normalized_phone text;
  normalized_code text;
  match_id uuid;
begin
  if actor is null then
    raise exception 'Authentication required';
  end if;

  normalized_phone := regexp_replace(coalesce(trim(p_phone), ''), '\\s+', '', 'g');
  normalized_code := trim(coalesce(p_code, ''));

  select pvc.id
    into match_id
  from public.phone_verification_codes pvc
  where pvc.user_id = actor
    and pvc.phone = normalized_phone
    and pvc.code = normalized_code
    and pvc.used_at is null
    and pvc.expires_at > now()
  order by pvc.created_at desc
  limit 1;

  if match_id is null then
    return jsonb_build_object('verified', false, 'reason', 'invalid_or_expired_code');
  end if;

  update public.phone_verification_codes
  set used_at = now()
  where id = match_id;

  update public.profiles
  set phone = normalized_phone,
      phone_verified = true,
      updated_at = now()
  where id = actor;

  return jsonb_build_object('verified', true);
end;
$$;

grant execute on function public.verify_phone_otp(text, text) to authenticated, service_role;

create or replace function public.cleanup_expired_phone_otps()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  with removed as (
    delete from public.phone_verification_codes
    where expires_at < now() - interval '1 day'
       or used_at < now() - interval '7 days'
    returning 1
  )
  select count(*) into deleted_count from removed;

  return coalesce(deleted_count, 0);
end;
$$;

grant execute on function public.cleanup_expired_phone_otps() to service_role;

create or replace function public.cleanup_stale_listing_drafts()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  with removed as (
    delete from public.listing_drafts
    where updated_at < now() - interval '45 days'
    returning 1
  )
  select count(*) into deleted_count from removed;

  return coalesce(deleted_count, 0);
end;
$$;

grant execute on function public.cleanup_stale_listing_drafts() to service_role;

create or replace function public.admin_action_handler(
  p_action text,
  p_target_type text,
  p_target_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  action_key text := lower(trim(coalesce(p_action, '')));
  target_key text := lower(trim(coalesce(p_target_type, '')));
  normalized_reason text := nullif(trim(coalesce(p_reason, '')), '');
  next_listing_status public.listing_status;
  next_profile_status public.verification_status;
  logged_action public.admin_action;
  logged_target public.admin_target_type;
begin
  if actor is null or not public.is_admin(actor) then
    raise exception 'Admin role required';
  end if;

  if target_key = 'listing' then
    logged_target := 'listing';

    case action_key
      when 'approve', 'approve_listing' then
        next_listing_status := 'approved';
        logged_action := 'approve_listing';
      when 'reject', 'reject_listing' then
        next_listing_status := 'rejected';
        logged_action := 'reject_listing';
      when 'flag' then
        next_listing_status := 'flagged';
        logged_action := 'flag';
      when 'unflag' then
        next_listing_status := 'pending';
        logged_action := 'unflag';
      when 'suspend' then
        next_listing_status := 'suspended';
        logged_action := 'suspend';
      else
        raise exception 'Unsupported listing action: %', p_action;
    end case;

    update public.listings
    set status = next_listing_status,
        rejection_reason = case when next_listing_status = 'rejected' then normalized_reason else null end,
        updated_at = now()
    where id = p_target_id;

    if not found then
      raise exception 'Listing not found';
    end if;

  elsif target_key in ('landlord', 'lister', 'profile') then
    logged_target := 'landlord';

    case action_key
      when 'approve', 'approve_landlord' then
        next_profile_status := 'verified';
        logged_action := 'approve_landlord';
      when 'reject', 'reject_landlord' then
        next_profile_status := 'rejected';
        logged_action := 'reject_landlord';
      when 'suspend' then
        next_profile_status := 'suspended';
        logged_action := 'suspend';
      else
        raise exception 'Unsupported landlord action: %', p_action;
    end case;

    update public.profiles
    set verification_status = next_profile_status,
        updated_at = now()
    where id = p_target_id
      and role in ('lister', 'admin');

    if not found then
      raise exception 'Landlord profile not found';
    end if;

  else
    raise exception 'Unsupported target type: %', p_target_type;
  end if;

  insert into public.admin_audit_log (admin_id, action, target_type, target_id, reason)
  values (actor, logged_action, logged_target, p_target_id, normalized_reason);

  return jsonb_build_object(
    'ok', true,
    'action', logged_action,
    'target_type', logged_target,
    'target_id', p_target_id
  );
end;
$$;

grant execute on function public.admin_action_handler(text, text, uuid, text) to authenticated, service_role;

create or replace function public.submit_listing(p_listing jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  next_id uuid;
begin
  if actor is null then
    raise exception 'Authentication required';
  end if;

  if not (public.is_lister(actor) or public.is_admin(actor)) then
    raise exception 'Lister role required';
  end if;

  insert into public.listings (
    lister_id,
    title,
    description,
    room_type,
    gender_preference,
    price_monthly,
    utilities_included,
    region,
    district,
    ward,
    street,
    lat,
    lng,
    amenities,
    house_rules,
    available_from,
    vacancy_status,
    status,
    featured,
    promotion_level,
    near_universities
  )
  values (
    actor,
    coalesce(p_listing ->> 'title', ''),
    coalesce(p_listing ->> 'description', ''),
    coalesce((p_listing ->> 'room_type')::public.room_type, 'single'),
    coalesce((p_listing ->> 'gender_preference')::public.gender_preference, 'any'),
    coalesce((p_listing ->> 'price_monthly')::integer, 0),
    coalesce((p_listing ->> 'utilities_included')::boolean, false),
    coalesce(p_listing ->> 'region', ''),
    coalesce(p_listing ->> 'district', ''),
    coalesce(p_listing ->> 'ward', ''),
    coalesce(p_listing ->> 'street', ''),
    nullif(p_listing ->> 'lat', '')::numeric,
    nullif(p_listing ->> 'lng', '')::numeric,
    coalesce((p_listing -> 'amenities')::jsonb, '{}'::jsonb),
    p_listing ->> 'house_rules',
    nullif(p_listing ->> 'available_from', '')::date,
    coalesce((p_listing ->> 'vacancy_status')::public.vacancy_status, 'available'),
    'pending',
    false,
    0,
    coalesce(array(select jsonb_array_elements_text(coalesce(p_listing -> 'near_universities', '[]'::jsonb))), '{}')
  )
  returning id into next_id;

  return next_id;
end;
$$;

grant execute on function public.submit_listing(jsonb) to authenticated, service_role;

-- ----------
-- Cron Jobs
-- ----------
do $$
declare
  existing_job_id bigint;
begin
  begin
    select jobid into existing_job_id
    from cron.job
    where jobname = 'cleanup-expired-phone-otps';

    if existing_job_id is not null then
      perform cron.unschedule(existing_job_id);
    end if;

    perform cron.schedule(
      'cleanup-expired-phone-otps',
      '*/30 * * * *',
      'select public.cleanup_expired_phone_otps();'
    );

    select jobid into existing_job_id
    from cron.job
    where jobname = 'cleanup-stale-listing-drafts';

    if existing_job_id is not null then
      perform cron.unschedule(existing_job_id);
    end if;

    perform cron.schedule(
      'cleanup-stale-listing-drafts',
      '0 3 * * *',
      'select public.cleanup_stale_listing_drafts();'
    );
  exception
    when undefined_table then
      raise notice 'pg_cron unavailable in this environment; skipping cron schedule setup';
  end;
end $$;

commit;
