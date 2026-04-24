-- Fix get_listing_with_contact RPC to pull email correctly
CREATE OR REPLACE FUNCTION public.get_listing_with_contact(p_listing_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_listing record;
  v_lister record;
  v_email text;
BEGIN
  -- 1. Get listing data from the primary view
  SELECT * INTO v_listing FROM public.listings WHERE id = p_listing_id;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- 2. Get email from auth.users (since it's not in the profiles table)
  SELECT email INTO v_email FROM auth.users WHERE id = v_listing.lister_id;

  -- 3. Get lister profile and include the email
  SELECT 
    p.id, 
    p.full_name, 
    p.phone, 
    v_email as email, -- Inject the email here
    p.verification_status, 
    p.avatar_url as profile_photo_url, 
    p.created_at 
  INTO v_lister 
  FROM public.profiles p
  WHERE p.id = v_listing.lister_id;

  RETURN json_build_object(
    'listing', row_to_json(v_listing),
    'listerProfile', row_to_json(v_lister)
  );
END;
$function$;

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
