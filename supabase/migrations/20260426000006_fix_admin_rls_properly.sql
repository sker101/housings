-- Fix Admin RLS policies to use is_admin() function instead of unreliable JWT role claim
-- 1. Profiles Table
DROP POLICY IF EXISTS "admin all profiles" ON public.profiles;
CREATE POLICY "admin all profiles" ON public.profiles FOR ALL USING (
  public.is_admin(auth.uid())
);

-- 2. Listings Table (View or Table)
DROP POLICY IF EXISTS "Admin manages all listings" ON public.listings;
CREATE POLICY "Admin manages all listings" ON public.listings FOR ALL USING (
  public.is_admin(auth.uid())
);

-- 3. Properties Table
DROP POLICY IF EXISTS "admin_manage_all" ON public.properties;
CREATE POLICY "admin_manage_all" ON public.properties FOR ALL USING (
  public.is_admin(auth.uid())
);

-- 4. Rooms Table
DROP POLICY IF EXISTS "admin_manage_rooms" ON public.rooms;
CREATE POLICY "admin_manage_rooms" ON public.rooms FOR ALL USING (
  public.is_admin(auth.uid())
);

-- 5. Landlords Table
DROP POLICY IF EXISTS "admin_manage_landlords" ON public.landlords;
CREATE POLICY "admin_manage_landlords" ON public.landlords FOR ALL USING (
  public.is_admin(auth.uid())
);

-- Ensure is_admin function is solid and bypasses RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin(target_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = target_user_id 
      AND (role = 'admin' OR 'admin' = ANY(roles))
  );
$$;
