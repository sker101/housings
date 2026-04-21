-- Ensure the CampusStay Admin actually has the 'admin' role in the profiles table.
-- The previous platform dump somehow mapped the admin user to a different role.
UPDATE profiles 
SET role = 'admin' 
WHERE full_name = 'CampusStay Admin' 
   OR role IN ('administrator', 'superuser');

-- For any user in auth.users with the admin email, force their profile to be admin
UPDATE profiles
SET role = 'admin'
WHERE id IN (
  SELECT id FROM auth.users 
  WHERE email = 'admin@campusstay.co'
) OR full_name = 'CampusStay Admin';
