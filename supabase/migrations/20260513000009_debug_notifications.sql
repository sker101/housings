CREATE OR REPLACE FUNCTION public.debug_notifications_columns()
RETURNS json
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT json_agg(column_name)
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'notifications';
$$;
