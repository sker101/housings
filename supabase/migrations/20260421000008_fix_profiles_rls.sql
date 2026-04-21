-- Fix infinite recursion in profiles RLS
drop policy if exists "admin all profiles" on profiles;

create policy "admin all profiles" on profiles for all using (
  (auth.jwt() ->> 'role') = 'admin'
  OR
  exists (
    select 1 from auth.users 
    where id = auth.uid() 
    and (raw_user_meta_data->>'role') = 'admin'
  )
);

-- Alternative simpler approach if JWT role is reliable
-- create policy "admin all profiles" on profiles for all using ( (auth.jwt() ->> 'role') = 'admin' );
