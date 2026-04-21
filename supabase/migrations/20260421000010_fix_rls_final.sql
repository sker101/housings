-- Final fix for profiles RLS to avoid recursion AND permission denied on auth.users
drop policy if exists "admin all profiles" on profiles;

create policy "admin all profiles" on profiles for all using (
  (auth.jwt() ->> 'role') = 'admin'
);

-- Ensure public access to the views again (just in case)
GRANT SELECT ON listings TO anon, authenticated;
GRANT SELECT ON listing_photos TO anon, authenticated;
