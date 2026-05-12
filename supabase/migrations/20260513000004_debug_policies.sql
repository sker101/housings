CREATE OR REPLACE FUNCTION public.debug_policies()
RETURNS json
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT json_agg(json_build_object('policyname', policyname, 'qual', qual, 'with_check', with_check)) 
  FROM pg_policies 
  WHERE tablename = 'profiles';
$$;
