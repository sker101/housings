-- ═══════════════════════════════════════════════════════════════
-- iRent Platform Revolution Migration
-- 2026-04-21
-- Extends the schema with ward-level geospatial data, preferred_ward,
-- referral earnings wallet, and aligns branding to iRent.
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────
-- 1. PROFILES: add preferred_ward column
-- ─────────────────────────────────────────
alter table if exists profiles
  add column if not exists preferred_ward text;

-- ─────────────────────────────────────────
-- 2. PROPERTIES: add ward & district columns for Smart Location
-- ─────────────────────────────────────────
alter table if exists properties
  add column if not exists ward       text,
  add column if not exists district   text;

-- ─────────────────────────────────────────
-- 3. TENANTS: add referral_earnings_tzs wallet
-- ─────────────────────────────────────────
alter table if exists tenants
  add column if not exists referral_earnings_tzs int default 0;

-- ─────────────────────────────────────────
-- 4. ROOMS: ensure ward column exists for filtering
-- ─────────────────────────────────────────
-- (ward is inherited via property_id join, but we cache it for fast search)
alter table if exists rooms
  add column if not exists ward text;

-- ─────────────────────────────────────────
-- 5. REFERRALS: ensure room-level referral_reward column
--    (tenant refers another tenant to their outgoing room)
-- ─────────────────────────────────────────
create table if not exists room_referrals (
  id                  uuid primary key default gen_random_uuid(),
  room_id             uuid references rooms(id) on delete cascade,
  referring_tenant_id uuid references tenants(id) on delete cascade,
  referred_tenant_id  uuid references tenants(id) on delete set null,
  referral_reward_tzs int default 20000,
  reward_paid         boolean default false,
  reward_paid_at      timestamptz,
  status              text default 'pending'
    check (status in ('pending','confirmed','reward_paid','cancelled')),
  created_at          timestamptz default now()
);

alter table room_referrals enable row level security;

create policy "tenant sees own room_referrals" on room_referrals for all using (
  referring_tenant_id in (select id from tenants where profile_id = auth.uid())
  or
  referred_tenant_id in (select id from tenants where profile_id = auth.uid())
);

create policy "admin bypass room_referrals" on room_referrals for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ─────────────────────────────────────────
-- 6. SYSTEM CONFIG: iRent branding & Mapbox key reference
-- ─────────────────────────────────────────
insert into system_config (key, value, description) values
  ('app_name',              'iRent',  'Platform display name'),
  ('sms_sender_tag',        'iRent',  'SMS sender signature appended to all messages'),
  ('payment_env',           'mock',   'mock | sandbox | live — controls Selcom gateway'),
  ('referral_reward_room_tzs', '20000', 'TZS reward when outgoing tenant''s referral pre-books their room')
on conflict (key) do update set value = excluded.value, description = excluded.description;

-- ─────────────────────────────────────────
-- 7. ADMIN AUDIT LOG: ensure ip_address and action columns exist
-- ─────────────────────────────────────────
alter table if exists admin_audit_log
  add column if not exists session_id text;

-- ─────────────────────────────────────────
-- 8. INDEX for ward-based room searches
-- ─────────────────────────────────────────
create index if not exists idx_properties_ward    on properties(ward);
create index if not exists idx_properties_city    on properties(city);
create index if not exists idx_rooms_ward          on rooms(ward);
create index if not exists idx_rooms_avail_status  on rooms(availability_status);
create index if not exists idx_tenant_leases_status on tenant_leases(status, days_remaining);

-- ─────────────────────────────────────────
-- 9. RLS: rooms — hide 'occupied' from public; allow assigned tenant/landlord/admin
-- ─────────────────────────────────────────
-- Drop the blanket public read policy and replace with occupancy-aware one
drop policy if exists "public read rooms" on rooms;

create policy "public read non-occupied rooms" on rooms for select using (
  availability_status != 'occupied'
);

create policy "tenant sees own occupied room" on rooms for select using (
  availability_status = 'occupied'
  and id in (
    select tl.room_id
    from tenant_leases tl
    join tenants t on t.id = tl.tenant_id
    where t.profile_id = auth.uid()
    and tl.status = 'active'
  )
);

create policy "landlord sees all own rooms" on rooms for select using (
  property_id in (
    select p.id from properties p
    join landlords l on l.id = p.landlord_id
    where l.profile_id = auth.uid()
  )
);

create policy "landlord manages own rooms" on rooms for insert with check (
  property_id in (
    select p.id from properties p
    join landlords l on l.id = p.landlord_id
    where l.profile_id = auth.uid()
  )
);

create policy "landlord updates own rooms" on rooms for update using (
  property_id in (
    select p.id from properties p
    join landlords l on l.id = p.landlord_id
    where l.profile_id = auth.uid()
  )
);

-- ─────────────────────────────────────────
-- 10. Function: flip_room_to_listed_occupied
--     Called when a tenant submits their move-out date.
-- ─────────────────────────────────────────
create or replace function flip_room_to_listed_occupied(
  p_lease_id uuid,
  p_move_out_date date
) returns void language plpgsql security definer as $$
declare
  v_room_id uuid;
  v_tenant_id uuid;
begin
  select room_id, tenant_id into v_room_id, v_tenant_id
  from tenant_leases
  where id = p_lease_id
    and status = 'active'
    and tenant_id in (select id from tenants where profile_id = auth.uid());

  if not found then
    raise exception 'Lease not found or access denied';
  end if;

  -- Update the lease end date & decision
  update tenant_leases
  set lease_end_date   = p_move_out_date,
      renewal_decision = 'leaving',
      move_out_confirmed = true
  where id = p_lease_id;

  -- Show the room as "listed_occupied" on the map (Coming Soon badge)
  update rooms
  set availability_status = 'listed_occupied',
      available_from       = p_move_out_date
  where id = v_room_id;
end;
$$;

-- ─────────────────────────────────────────
-- 11. Function: pay_room_referral_reward
--     Credits 20,000 TZS to referring tenant's wallet when a pre-booking is confirmed.
-- ─────────────────────────────────────────
create or replace function pay_room_referral_reward(
  p_room_referral_id uuid
) returns void language plpgsql security definer as $$
declare
  v_reward  int;
  v_tenant  uuid;
begin
  select referral_reward_tzs, referring_tenant_id
  into v_reward, v_tenant
  from room_referrals
  where id = p_room_referral_id
    and status = 'confirmed'
    and not reward_paid;

  if not found then return; end if;

  update tenants
  set referral_earnings_tzs = referral_earnings_tzs + v_reward
  where id = v_tenant;

  update room_referrals
  set reward_paid    = true,
      reward_paid_at = now(),
      status         = 'reward_paid'
  where id = p_room_referral_id;
end;
$$;
