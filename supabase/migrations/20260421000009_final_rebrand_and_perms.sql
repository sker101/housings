-- Grant permissions to the listings and listing_photos views
GRANT SELECT ON listings TO anon, authenticated;
GRANT SELECT ON listing_photos TO anon, authenticated;

-- Ensure CampusStay Admin is fully rebranded to iRent Admin and has admin role
-- Only update profiles that exist in auth.users to avoid FK violation
UPDATE profiles 
SET full_name = 'iRent Admin',
    role = 'admin'
WHERE (full_name = 'CampusStay Admin' OR role = 'admin')
  AND id IN (SELECT id FROM auth.users);

-- Re-check any other branding in DB
-- Only update profiles that exist in auth.users to avoid FK violation
UPDATE profiles 
SET full_name = replace(full_name, 'CampusStay', 'iRent')
WHERE id IN (SELECT id FROM auth.users);
