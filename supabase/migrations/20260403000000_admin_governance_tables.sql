-- Admin Governance Tables Migration
-- Created: 2026-04-03

-- Create admin_audit_log table
create table if not exists admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references profiles(id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz default now()
);

-- Create disputes table
create table if not exists disputes (
  id uuid primary key default gen_random_uuid(),
  type text check (type in ('deposit', 'listing', 'payment', 'other')),
  title text not null,
  description text,
  status text default 'open' check (status in ('open', 'under_review', 'resolved')),
  priority text default 'medium' check (priority in ('low', 'medium', 'urgent')),
  reporter_id uuid references profiles(id) on delete set null,
  respondent_id uuid references profiles(id) on delete set null,
  listing_id uuid references listings(id) on delete set null,
  amount_disputed numeric(10, 2),
  resolution text,
  resolved_by uuid references profiles(id) on delete set null,
  resolution_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create content_flags table
create table if not exists content_flags (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references listings(id) on delete cascade,
  reported_by uuid references profiles(id) on delete set null,
  reason text not null,
  status text default 'pending' check (status in ('pending', 'reviewed', 'cleared')),
  notes text,
  flagged_by_system boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create system_config table
create table if not exists system_config (
  key text primary key,
  value text not null,
  value_type text default 'string' check (value_type in ('string', 'number', 'boolean', 'json')),
  description text,
  updated_at timestamptz default now(),
  updated_by uuid references profiles(id) on delete set null
);

-- Create banned_phones table
create table if not exists banned_phones (
  id uuid primary key default gen_random_uuid(),
  phone text unique not null,
  banned_at timestamptz default now(),
  banned_by uuid references profiles(id) on delete set null,
  reason text,
  expires_at timestamptz
);

-- Create indexes for performance
create index if not exists idx_admin_audit_log_admin_id on admin_audit_log(admin_id);
create index if not exists idx_admin_audit_log_created_at on admin_audit_log(created_at desc);
create index if not exists idx_admin_audit_log_target on admin_audit_log(target_type, target_id);

create index if not exists idx_disputes_status on disputes(status);
create index if not exists idx_disputes_reporter_id on disputes(reporter_id);
create index if not exists idx_disputes_respondent_id on disputes(respondent_id);
create index if not exists idx_disputes_created_at on disputes(created_at desc);

create index if not exists idx_content_flags_listing_id on content_flags(listing_id);
create index if not exists idx_content_flags_status on content_flags(status);
create index if not exists idx_content_flags_created_at on content_flags(created_at desc);

-- Enable Row Level Security
alter table admin_audit_log enable row level security;
alter table disputes enable row level security;
alter table content_flags enable row level security;
alter table system_config enable row level security;
alter table banned_phones enable row level security;

-- Create a security definer function to check if user is admin
create or replace function public.is_admin(target_user_id uuid default auth.uid()) returns boolean as $$
  select exists (
    select 1 from public.profiles where id = target_user_id and role = 'admin'
  );
$$ language sql security definer;

-- RLS Policies: Only admins can access admin tables
create policy "admins_can_read_audit_log" on admin_audit_log
  for select using (is_admin(auth.uid()));

create policy "admins_can_insert_audit_log" on admin_audit_log
  for insert with check (is_admin(auth.uid()));

create policy "admins_can_read_disputes" on disputes
  for select using (is_admin(auth.uid()) or reporter_id = auth.uid() or respondent_id = auth.uid());

create policy "admins_can_update_disputes" on disputes
  for update using (is_admin(auth.uid()));

create policy "admins_can_insert_disputes" on disputes
  for insert with check (is_admin(auth.uid()) or reporter_id = auth.uid());

create policy "admins_can_read_flags" on content_flags
  for select using (is_admin(auth.uid()));

create policy "admins_can_update_flags" on content_flags
  for update using (is_admin(auth.uid()));

create policy "anyone_can_report_flags" on content_flags
  for insert with check (auth.uid() is not null);

create policy "admins_can_read_system_config" on system_config
  for select using (is_admin(auth.uid()));

create policy "admins_can_update_system_config" on system_config
  for update using (is_admin(auth.uid()));

create policy "admins_can_insert_system_config" on system_config
  for insert with check (is_admin(auth.uid()));

create policy "admins_can_read_banned_phones" on banned_phones
  for select using (is_admin(auth.uid()));

create policy "admins_can_update_banned_phones" on banned_phones
  for update using (is_admin(auth.uid()));

-- Insert default system config keys
insert into system_config (key, value, value_type, description)
values
  ('registrations_open', 'true', 'boolean', 'Whether new user registrations are allowed'),
  ('email_verification_required', 'true', 'boolean', 'Whether email verification is required before listing'),
  ('payment_env', 'sandbox', 'string', 'Payment environment: mock, sandbox, or live'),
  ('dalali_subscriptions_enabled', 'true', 'boolean', 'Whether dalali tier subscriptions are enabled'),
  ('sms_enabled', 'true', 'boolean', 'Whether SMS notifications are enabled'),
  ('maintenance_mode', 'false', 'boolean', 'Whether the platform is in maintenance mode'),
  ('platform_commission_pct', '5.0', 'number', 'Platform commission percentage on bookings'),
  ('dalali_pro_monthly_tzs', '50000', 'number', 'Monthly price for Dalali Pro tier in TZS'),
  ('featured_listing_boost_tzs', '10000', 'number', 'Price for featured listing boost in TZS')
on conflict (key) do nothing;

-- Create trigger to update updated_at on disputes
create or replace function update_disputes_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists disputes_updated_at on disputes;
create trigger disputes_updated_at
  before update on disputes
  for each row
  execute function update_disputes_updated_at();

-- Create trigger to update updated_at on content_flags
create or replace function update_content_flags_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists content_flags_updated_at on content_flags;
create trigger content_flags_updated_at
  before update on content_flags
  for each row
  execute function update_content_flags_updated_at();
