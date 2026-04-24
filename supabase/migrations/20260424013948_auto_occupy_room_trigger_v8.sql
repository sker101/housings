-- AUTOMATIC ROOM OCCUPANCY TRIGGER
-- This system ensures that the moment a booking is marked as 'paid', the room is 
-- immediately and automatically taken off the market. This happens at the database
-- level, so it works even if the user closes their browser.

-- 1. Create the automation function
CREATE OR REPLACE FUNCTION public.handle_booking_payment_automation()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the booking has transitioned to the 'paid' state
  IF (NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status <> 'paid')) THEN
    -- Update the room status directly in the rooms table
    UPDATE public.rooms
    SET availability_status = 'occupied'
    WHERE id = NEW.listing_id;
    
    -- Also update any views/caches if necessary
    -- (The listings view is dynamic, so it will update automatically)
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Attach the trigger to the 'bookings' table
-- This triggers on both new bookings (if created as paid) and updates
DROP TRIGGER IF EXISTS tr_auto_occupy_room ON public.bookings;
CREATE TRIGGER tr_auto_occupy_room
AFTER UPDATE OR INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.handle_booking_payment_automation();

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
