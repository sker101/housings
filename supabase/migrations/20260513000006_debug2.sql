CREATE OR REPLACE FUNCTION public.debug_policies2()
RETURNS json
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT json_agg(json_build_object('tablename', tablename, 'policyname', policyname, 'qual', qual, 'with_check', with_check)) 
  FROM pg_policies 
  WHERE tablename IN ('bookings', 'tenants', 'landlords');
$$;
