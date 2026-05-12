DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE
  USING (
    id = auth.uid() OR public.is_admin(auth.uid())
  )
  WITH CHECK (
    id = auth.uid() OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "admin all profiles" ON public.profiles;
