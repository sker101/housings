-- Create reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
    tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    lister_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Reviews viewable by everyone" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Tenants can insert their own reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = tenant_id);
CREATE POLICY "Tenants can update their own reviews" ON public.reviews FOR UPDATE USING (auth.uid() = tenant_id);

-- Update trigger for listing average rating
CREATE OR REPLACE FUNCTION public.refresh_listing_avg_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.listings
  SET avg_rating = (
    SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 0)
    FROM public.reviews
    WHERE listing_id = COALESCE(NEW.listing_id, OLD.listing_id)
  )
  WHERE id = COALESCE(NEW.listing_id, OLD.listing_id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_review_change ON public.reviews;
CREATE TRIGGER on_review_change
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.refresh_listing_avg_rating();

-- Function to handle SMS notifications
CREATE OR REPLACE FUNCTION public.handle_booking_sms_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_name TEXT;
  v_tenant_phone TEXT;
  v_lister_phone TEXT;
  v_listing_title TEXT;
  v_message TEXT;
  v_recipient_phone TEXT;
BEGIN
  -- Fetch tenant details
  SELECT full_name, phone INTO v_tenant_name, v_tenant_phone
  FROM public.profiles
  WHERE id = NEW.tenant_id;
  
  -- Fetch listing and lister details
  SELECT l.title, p.phone INTO v_listing_title, v_lister_phone
  FROM public.listings l
  JOIN public.profiles p ON l.lister_id = p.id
  WHERE l.id = NEW.listing_id;

  -- Prepare message and recipient based on TG_OP and status
  IF TG_OP = 'INSERT' THEN
    -- Dalali notification
    v_message := replace(replace('CampusStay: {tenant_name} amependa chumba chako ''{listing_title}''. Ingia kwenye app kukubali.', '{tenant_name}', COALESCE(v_tenant_name, 'Mteja')), '{listing_title}', COALESCE(v_listing_title, ''));
    v_recipient_phone := v_lister_phone;
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'approved' THEN
      v_message := replace('CampusStay: Ombi lako la ''{listing_title}'' limekubaliwa! Wasiliana na mmiliki.', '{listing_title}', COALESCE(v_listing_title, ''));
      v_recipient_phone := v_tenant_phone;
    ELSIF NEW.status = 'declined' THEN
      v_message := replace('CampusStay: Ombi lako la ''{listing_title}'' haukukubaliwa. Endelea kutafuta kwenye CampusStay.', '{listing_title}', COALESCE(v_listing_title, ''));
      v_recipient_phone := v_tenant_phone;
    END IF;
  END IF;

  -- Call edge function using pg_net POST
  IF v_message IS NOT NULL AND v_recipient_phone IS NOT NULL AND v_recipient_phone != '' THEN
    PERFORM net.http_post(
        url := (select current_setting('app.settings.send_sms_url', true)), -- You can config this in standard supabase ENV
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := json_build_object(
            'to', v_recipient_phone,
            'message', v_message
        )::jsonb
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for SMS on bookings
DROP TRIGGER IF EXISTS booking_sms_trigger ON public.bookings;
CREATE TRIGGER booking_sms_trigger
  AFTER INSERT OR UPDATE OF status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_booking_sms_notification();
