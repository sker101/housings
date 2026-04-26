-- REPAIR MISSING COORDINATES
-- This migration finds properties with missing or zero coordinates 
-- and gives them a default location in Dar es Salaam so they appear on the map.

DO $$
BEGIN
    -- Update properties that have 0,0 or NULL coordinates
    -- We'll default them to a central point in Dar es Salaam (near Posta/Kariakoo)
    -- Lat: -6.8163, Lng: 39.2766
    
    UPDATE public.properties
    SET 
        latitude = -6.8163,
        longitude = 39.2766
    WHERE (latitude IS NULL OR latitude = 0)
       OR (longitude IS NULL OR longitude = 0);

    RAISE NOTICE 'Repaired coordinates for all properties. Rooms should now be visible on the map.';
END $$;
