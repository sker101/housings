-- Create an INSTEAD OF UPDATE trigger to make the listings view updatable
CREATE OR REPLACE FUNCTION public.trg_update_listings_view()
RETURNS TRIGGER AS $$
BEGIN
    -- Update Properties table
    UPDATE public.properties
    SET 
        verification_status = CASE 
            WHEN NEW.status = 'approved' THEN 'verified'
            WHEN NEW.status = 'pending' THEN 'pending'
            WHEN NEW.status = 'rejected' THEN 'unverified'
            ELSE verification_status
        END,
        rejection_reason = COALESCE(NEW.rejection_reason, rejection_reason),
        status = CASE 
            WHEN NEW.status = 'flagged' THEN 'flagged'
            WHEN NEW.status = 'removed' THEN 'inactive'
            ELSE 'active'
        END
    WHERE id = OLD.property_id;

    -- Update Rooms table (Sync occupancy status with moderation status)
    UPDATE public.rooms
    SET 
        availability_status = CASE 
            WHEN NEW.status = 'approved' THEN 'available'
            WHEN NEW.status = 'removed' THEN 'unavailable'
            ELSE availability_status
        END,
        is_available = (NEW.status = 'approved')
    WHERE id = OLD.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_upd_listings ON public.listings;
CREATE TRIGGER trg_upd_listings
INSTEAD OF UPDATE ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.trg_update_listings_view();
