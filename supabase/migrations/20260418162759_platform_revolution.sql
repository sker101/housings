-- ─────────────────────────────────────────
-- RESET SCHEMA (Build from scratch)
-- ─────────────────────────────────────────
drop table if exists admin_audit_log cascade;
drop table if exists content_flags cascade;
drop table if exists system_config cascade;
drop table if exists disputes cascade;
drop table if exists reviews cascade;
drop table if exists referrals cascade;
drop table if exists payments cascade;
drop table if exists bookings cascade;
drop table if exists pre_bookings cascade;
drop table if exists tenant_leases cascade;
drop table if exists room_photos cascade;
drop table if exists rooms cascade;
drop table if exists property_documents cascade;
drop table if exists properties cascade;
drop table if exists manager_landlord_auth cascade;
drop table if exists property_managers cascade;
drop table if exists landlords cascade;
drop table if exists tenants cascade;
-- drop table if exists profiles cascade; -- Keep profiles if possible? No, user said "from scratch" but profiles is central.
-- Actually, the user's prompt Part 1 includes "profiles" in the from-scratch list.
drop table if exists profiles cascade;

-- ─────────────────────────────────────────
-- CORE IDENTITY
-- ─────────────────────────────────────────

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('tenant','landlord','property_manager','admin')),
  full_name text,
  phone text unique,
  national_id text,
  avatar_url text,
  is_verified boolean default false,
  is_suspended boolean default false,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────
-- TENANT
-- ─────────────────────────────────────────

create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade unique,
  tenant_type text check (tenant_type in ('student','professional','family','other')),
  occupation text,
  employer_or_institution text,
  current_address text,
  emergency_contact text,
  id_document_url text,
  verification_status text default 'unverified'
    check (verification_status in ('unverified','pending','verified')),
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────
-- LANDLORD
-- ─────────────────────────────────────────

create table if not exists landlords (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade unique,
  business_name text,
  subscription_tier text default 'starter'
    check (subscription_tier in ('starter','owner_pro','portfolio')),
  identity_verified boolean default false,
  property_verified boolean default false,
  trusted_host boolean default false,
  verified_at timestamptz,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────
-- PROPERTY MANAGER (formerly dalali)
-- ─────────────────────────────────────────

create table if not exists property_managers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade unique,
  badge_level text default 'bronze'
    check (badge_level in ('bronze','silver','gold')),
  is_verified boolean default false,
  total_listings_managed int default 0,
  successful_placements int default 0,
  rating numeric(3,2) default 0,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────
-- MANAGER ↔ LANDLORD AUTHORIZATION
-- ─────────────────────────────────────────

create table if not exists manager_landlord_auth (
  id uuid primary key default gen_random_uuid(),
  manager_id uuid references property_managers(id) on delete cascade,
  landlord_id uuid references landlords(id) on delete cascade,
  status text default 'pending'
    check (status in ('pending','active','revoked','expired')),
  otp_confirmed boolean default false,
  authorized_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz default now(),
  unique(manager_id, landlord_id)
);

-- ─────────────────────────────────────────
-- PROPERTIES
-- ─────────────────────────────────────────

create table if not exists properties (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid references landlords(id) on delete cascade,
  manager_id uuid references property_managers(id) on delete set null,
  title text not null,
  description text,
  address text,
  neighbourhood text,
  city text default 'Dar es Salaam',
  latitude numeric(10,7),
  longitude numeric(10,7),
  status text default 'active'
    check (status in ('active','inactive','flagged','suspended')),
  verification_status text default 'unverified'
    check (verification_status in ('unverified','pending','verified')),
  identity_verified boolean default false,
  property_verified boolean default false,
  trusted_host boolean default false,
  is_featured boolean default false,
  featured_until timestamptz,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────
-- PROPERTY DOCUMENTS
-- ─────────────────────────────────────────

create table if not exists property_documents (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  uploaded_by uuid references profiles(id),
  doc_type text check (doc_type in ('title_deed','national_id','utility_bill','tax_receipt','other')),
  file_url text,
  verification_status text default 'pending'
    check (verification_status in ('pending','verified','rejected')),
  admin_notes text,
  uploaded_at timestamptz default now()
);

-- ─────────────────────────────────────────
-- ROOMS
-- ─────────────────────────────────────────

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  room_number text,
  room_type text check (room_type in ('single','double','self_contained','shared','bedsitter')),
  price_tzs int not null,
  deposit_tzs int default 0,
  availability_status text default 'occupied'
    check (availability_status in (
      'occupied',
      'listed_occupied',
      'available_soon',
      'pre_booked',
      'available',
      'unavailable'
    )),
  is_available boolean default false,
  available_from date,
  floor_number int,
  max_occupants int default 1,
  amenities text[],
  description text,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────
-- ROOM PHOTOS
-- ─────────────────────────────────────────

create table if not exists room_photos (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  photo_url text not null,
  is_cover boolean default false,
  sort_order int default 0,
  uploaded_at timestamptz default now()
);

-- ─────────────────────────────────────────
-- TENANT LEASES (tracks active occupancy)
-- ─────────────────────────────────────────

create table if not exists tenant_leases (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade,
  landlord_id uuid references landlords(id),
  lease_start_date date not null,
  lease_end_date date not null,
  days_remaining int, -- Updated via lease-tracker edge function or calculated on-the-fly
  move_out_confirmed boolean default false,
  renewal_decision text check (renewal_decision in ('renewing','leaving','undecided')),
  renewal_sms_sent boolean default false,
  status text default 'active'
    check (status in ('active','extended','ended','vacated_early')),
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────
-- PRE-BOOKINGS
-- ─────────────────────────────────────────

create table if not exists pre_bookings (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade,
  available_from date not null,
  deposit_tzs int not null,
  deposit_paid boolean default false,
  payment_ref text,
  payment_deadline timestamptz,
  status text default 'pending'
    check (status in ('pending','confirmed','no_show','cancelled','converted')),
  created_at timestamptz default now(),
  constraint one_active_prebooking unique (room_id, status)
    deferrable initially deferred
);

-- ─────────────────────────────────────────
-- BOOKINGS
-- ─────────────────────────────────────────

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  room_id uuid references rooms(id) on delete cascade,
  property_id uuid references properties(id) on delete cascade,
  landlord_id uuid references landlords(id),
  pre_booking_id uuid references pre_bookings(id),
  status text default 'pending'
    check (status in ('pending','confirmed','cancelled','completed','disputed')),
  move_in_date date,
  move_out_date date,
  months_duration int,
  total_tzs int,
  notes text,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────
-- ROOM INQUIRIES & CHATS
-- ─────────────────────────────────────────

create table if not exists room_inquiries (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade,
  status text default 'open' check (status in ('open','negotiating','accepted','declined')),
  last_message text,
  created_at timestamptz default now()
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid references room_inquiries(id) on delete cascade,
  sender_id uuid references profiles(id),
  body text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────
-- PAYMENTS
-- ─────────────────────────────────────────

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id),
  pre_booking_id uuid references pre_bookings(id),
  tenant_id uuid references tenants(id),
  landlord_id uuid references landlords(id),
  amount_tzs int not null,
  payment_type text check (payment_type in ('deposit','first_month','rent','prebooking_deposit','refund')),
  payment_method text check (payment_method in ('mpesa','tigopesa','airtel_money','bank_transfer','card')),
  status text default 'pending'
    check (status in ('pending','processing','completed','failed','refunded')),
  selcom_ref text,
  paid_at timestamptz,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────
-- REFERRALS (tenant refers landlord)
-- ─────────────────────────────────────────

create table if not exists referrals (
  id uuid primary key default gen_random_uuid(),
  referring_tenant_id uuid references tenants(id) on delete cascade,
  landlord_id uuid references landlords(id) on delete cascade,
  status text default 'pending'
    check (status in ('pending','landlord_registered','documents_submitted','verified','reward_paid','rejected')),
  reward_tzs int default 20000,
  reward_paid boolean default false,
  reward_paid_at timestamptz,
  notes text,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────
-- REVIEWS
-- ─────────────────────────────────────────

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  reviewer_id uuid references profiles(id) on delete cascade,
  reviewee_id uuid references profiles(id) on delete cascade,
  property_id uuid references properties(id) on delete set null,
  booking_id uuid references bookings(id) on delete set null,
  rating int check (rating between 1 and 5),
  body text,
  reviewer_role text check (reviewer_role in ('tenant','landlord','property_manager')),
  is_flagged boolean default false,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────
-- DISPUTES
-- ─────────────────────────────────────────

create table if not exists disputes (
  id uuid primary key default gen_random_uuid(),
  raised_by uuid references profiles(id) on delete cascade,
  against_id uuid references profiles(id) on delete cascade,
  booking_id uuid references bookings(id) on delete set null,
  category text check (category in ('payment','property_condition','lease_terms','harassment','fraud','other')),
  description text,
  status text default 'open'
    check (status in ('open','under_review','resolved','closed')),
  resolution text,
  resolved_by uuid references profiles(id),
  resolved_at timestamptz,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────
-- CONTENT FLAGS
-- ─────────────────────────────────────────

create table if not exists content_flags (
  id uuid primary key default gen_random_uuid(),
  flagged_by uuid references profiles(id),
  target_type text check (target_type in ('listing','review','profile','message')),
  target_id uuid,
  reason text,
  status text default 'pending'
    check (status in ('pending','reviewed','dismissed','actioned')),
  admin_notes text,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────
-- SYSTEM CONFIG
-- ─────────────────────────────────────────

create table if not exists system_config (
  key text primary key,
  value text,
  description text,
  updated_by uuid references profiles(id),
  updated_at timestamptz default now()
);

insert into system_config (key, value, description) values
  ('booking_commission_pct', '8', 'Percentage commission on each booking'),
  ('referral_reward_tzs', '20000', 'Reward paid to tenant per verified landlord referral'),
  ('prebooking_deposit_pct', '50', 'Percentage of first month rent required to pre-book'),
  ('featured_listing_tzs', '30000', 'Monthly cost for featured listing placement'),
  ('payment_env', 'mock', 'mock | sandbox | live'),
  ('renewal_sms_days', '30', 'Days before lease end to send renewal SMS')
on conflict (key) do nothing;

-- ─────────────────────────────────────────
-- ADMIN AUDIT LOG
-- ─────────────────────────────────────────

create table if not exists admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references profiles(id),
  action text not null,
  target_table text,
  target_id uuid,
  before_state jsonb,
  after_state jsonb,
  ip_address text,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────

alter table profiles enable row level security;
alter table tenants enable row level security;
alter table landlords enable row level security;
alter table property_managers enable row level security;
alter table manager_landlord_auth enable row level security;
alter table properties enable row level security;
alter table property_documents enable row level security;
alter table rooms enable row level security;
alter table room_photos enable row level security;
alter table tenant_leases enable row level security;
alter table pre_bookings enable row level security;
alter table bookings enable row level security;
alter table payments enable row level security;
alter table referrals enable row level security;
alter table reviews enable row level security;
alter table disputes enable row level security;
alter table content_flags enable row level security;
alter table room_inquiries enable row level security;
alter table chat_messages enable row level security;
alter table admin_audit_log enable row level security;

-- Profiles: users see their own, admins see all
create policy "own profile" on profiles for all using (auth.uid() = id);
create policy "admin all profiles" on profiles for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Properties: public read, landlord/manager write
create policy "public read properties" on properties for select using (status = 'active');
create policy "landlord manages own properties" on properties for all using (
  landlord_id in (select id from landlords where profile_id = auth.uid())
);
create policy "manager manages authorized properties" on properties for all using (
  manager_id in (
    select pm.id from property_managers pm
    join manager_landlord_auth mla on mla.manager_id = pm.id
    where pm.profile_id = auth.uid() and mla.status = 'active'
  )
);

-- Rooms: public read
create policy "public read rooms" on rooms for select using (true);

-- Bookings: tenant sees own, landlord sees their property bookings
create policy "tenant own bookings" on bookings for all using (
  tenant_id in (select id from tenants where profile_id = auth.uid())
);
create policy "landlord sees bookings" on bookings for select using (
  landlord_id in (select id from landlords where profile_id = auth.uid())
);

-- Admin bypass policy on all tables
do $$
declare t text;
begin
  foreach t in array array[
    'tenants','landlords','property_managers','manager_landlord_auth',
    'properties','property_documents','rooms','room_photos','tenant_leases',
    'pre_bookings','bookings','payments','referrals','reviews','disputes',
    'content_flags','system_config','admin_audit_log','room_inquiries','chat_messages'
  ] loop
    execute format(
      'create policy "admin bypass %I" on %I for all using (
        exists (select 1 from profiles where id = auth.uid() and role = ''admin'')
      )', t, t
    );
  end loop;
end $$;
