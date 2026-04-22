-- Ensure the iRent Admin actually has the 'admin' role in the profiles table.
-- The previous platform dump somehow mapped the admin user to a different role.
UPDATE profiles 
SET role = 'admin' 
WHERE full_name = 'CampusStay Admin'
   OR full_name = 'iRent Admin'
   OR role IN ('administrator', 'superuser');

-- For any user in auth.users with the admin email, force their profile to be admin
UPDATE profiles
SET role = 'admin',
    full_name = 'iRent Admin'
WHERE id IN (
  SELECT id FROM auth.users 
  WHERE email = 'admin@campusstay.co'
     OR email = 'admin@irent.co.tz'
) OR full_name = 'CampusStay Admin'
  OR full_name = 'iRent Admin';

