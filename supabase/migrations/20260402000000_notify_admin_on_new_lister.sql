-- Notify all admin users when a new lister registers and needs verification
CREATE OR REPLACE FUNCTION public.trg_notify_admin_new_lister()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  -- Only fire when a NEW lister profile is inserted with pending status
  -- OR when an existing profile's role changes to 'lister' with pending verification
  IF NEW.role = 'lister' AND
     (NEW.verification_status = 'pending' OR NEW.verification_status = 'unverified') AND
     (TG_OP = 'INSERT' OR OLD.role IS DISTINCT FROM 'lister') THEN

    -- Send notification to every admin account
    FOR v_admin_id IN
      SELECT id FROM public.profiles WHERE role = 'admin'
    LOOP
      PERFORM public.push_notification(
        v_admin_id,
        'new_lister_pending',
        'New Dalali Account Pending',
        format('%s has registered as a Dalali and needs your verification.', COALESCE(NEW.full_name, 'A new user')),
        '/admin/landlords'
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_new_lister ON public.profiles;
CREATE TRIGGER trg_notify_admin_new_lister
  AFTER INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_admin_new_lister();

-- Notify all admin users when a new listing is submitted (status = 'pending')
CREATE OR REPLACE FUNCTION public.trg_notify_admin_new_listing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid;
  v_lister_name text;
BEGIN
  -- Only fire when a listing becomes 'pending'
  IF NEW.status = 'pending' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'pending') THEN

    SELECT full_name INTO v_lister_name FROM public.profiles WHERE id = NEW.lister_id;

    FOR v_admin_id IN
      SELECT id FROM public.profiles WHERE role = 'admin'
    LOOP
      PERFORM public.push_notification(
        v_admin_id,
        'new_listing_pending',
        'New Listing Pending Review',
        format('"%s" by %s has been submitted and needs your approval.', NEW.title, COALESCE(v_lister_name, 'a lister')),
        '/admin/listings'
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_new_listing ON public.listings;
CREATE TRIGGER trg_notify_admin_new_listing
  AFTER INSERT OR UPDATE OF status ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_admin_new_listing();
