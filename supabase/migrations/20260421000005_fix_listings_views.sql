-- 1. Recreate reviews if missing
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  reviewer_id uuid references profiles(id) on delete cascade,
  reviewee_id uuid references profiles(id) on delete cascade,
  property_id uuid references properties(id) on delete set null,
  booking_id uuid, -- skipping foreign key just in case it doesn't match
  rating int check (rating between 1 and 5),
  body text,
  reviewer_role text check (reviewer_role in ('tenant','landlord','property_manager')),
  is_flagged boolean default false,
  created_at timestamptz default now()
);

-- 2. Create listing_photos as a view over room_photos
create or replace view listing_photos as
select
  id,
  room_id as listing_id,
  '' as angle,
  photo_url as public_url,
  false as ai_verified,
  0 as ai_confidence,
  sort_order as position,
  '' as caption,
  is_cover,
  uploaded_at as created_at
from room_photos;

-- 3. Create saved_listings as a view (we can just leave it as a table if we want them to save but let's make it a table)
create table if not exists saved_listings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references profiles(id),
  listing_id uuid references rooms(id),
  saved_at timestamptz default now()
);

-- Update RLS for views/tables just in case
ALTER TABLE saved_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant sees own saved_listings" ON saved_listings
  FOR ALL USING (tenant_id = auth.uid());
