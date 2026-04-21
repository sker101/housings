-- Force admin role for users with 'Admin' in their name OR specific emails
UPDATE profiles 
SET role = 'admin'
WHERE (full_name ILIKE '%Admin%' OR full_name ILIKE '%Super%')
   OR id IN (
     SELECT id FROM auth.users 
     WHERE email IN ('admin@campusstay.co', 'admin@irent.co.tz', 'admin@campusstaytz.com')
   );

-- Also ensure they are in the profiles table if they were missing
INSERT INTO profiles (id, full_name, role)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', email), 'admin'
FROM auth.users
WHERE (email IN ('admin@campusstay.co', 'admin@irent.co.tz', 'admin@campusstaytz.com')
       OR raw_user_meta_data->>'full_name' ILIKE '%Admin%')
ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- Fix the auth.uid() check in RLS for profiles if it's broken
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
CREATE POLICY "profiles_select_policy" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
CREATE POLICY "profiles_update_policy" ON profiles FOR UPDATE USING (auth.uid() = id OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
