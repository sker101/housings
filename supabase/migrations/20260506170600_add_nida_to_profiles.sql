begin;

-- Add nida_number as varchar(20) — exactly 20 digits, no letters
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS nida_number varchar(20);

-- Add business_name as text
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS business_name text;

-- Add occupation as text
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS occupation text;

-- Add email as text (resolves "email column not found" error)
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS email text;

-- Drop old constraint if it exists (safe re-run)
ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS nida_number_format;

-- Enforce: digits only, exactly 20 characters
ALTER TABLE public.profiles
  ADD CONSTRAINT nida_number_format
  CHECK (nida_number IS NULL OR nida_number ~ '^[0-9]{20}$');

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger AS $$
DECLARE
  v_role text := lower(coalesce(new.raw_user_meta_data ->> 'role', 'tenant'));
  resolved_role text := case
    when v_role in ('student') then 'tenant'
    when v_role in ('lister') then 'landlord'
    when v_role in ('dalali') then 'property_manager'
    when v_role in ('admin', 'tenant', 'landlord', 'property_manager') then v_role
    else 'tenant'
  end;
BEGIN
  INSERT INTO public.profiles (
    id, role, full_name, email, phone, nida_number,
    business_name, occupation, created_at
  )
  VALUES (
    new.id,
    resolved_role,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1), 'New User'),
    new.email,
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    nullif(new.raw_user_meta_data ->> 'nida_number', ''),
    nullif(new.raw_user_meta_data ->> 'business_name', ''),
    nullif(new.raw_user_meta_data ->> 'occupation', ''),
    now()
  )
  on conflict (id) do update set
    nida_number    = excluded.nida_number,
    business_name  = coalesce(profiles.business_name, excluded.business_name),
    occupation     = coalesce(profiles.occupation, excluded.occupation),
    email          = coalesce(profiles.email, excluded.email),
    phone          = coalesce(profiles.phone, excluded.phone);

  return new;
end;
$$ LANGUAGE plpgsql;

commit;
