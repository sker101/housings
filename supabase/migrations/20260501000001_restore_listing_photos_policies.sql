-- Restore listing_photos RLS policies that were dropped by cascade when listings view was recreated
-- 1. Create robust policies for listing_photos that don't depend solely on the view to prevent future cascade drops
-- 2. Allow listers to insert, update, delete their own photos
-- 3. Allow public to select photos

-- Drop any existing policies just in case
DROP POLICY IF EXISTS "listing_photos_select" ON public.listing_photos;
DROP POLICY IF EXISTS "listing_photos_insert" ON public.listing_photos;
DROP POLICY IF EXISTS "listing_photos_update" ON public.listing_photos;
DROP POLICY IF EXISTS "listing_photos_delete" ON public.listing_photos;

-- SELECT: Public can see photos
CREATE POLICY "listing_photos_select"
  ON public.listing_photos FOR SELECT
  USING (true);

-- INSERT: Lister or Admin can insert
CREATE POLICY "listing_photos_insert"
  ON public.listing_photos FOR INSERT
  WITH CHECK (
    -- Check if the user owns the room
    EXISTS (
      SELECT 1 FROM public.rooms r
      JOIN public.properties p ON r.property_id = p.id
      JOIN public.landlords ll ON p.landlord_id = ll.id
      WHERE r.id = listing_id AND ll.profile_id = auth.uid()
    ) OR
    -- Fallback for legacy listings or admin
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- UPDATE: Lister or Admin can update
CREATE POLICY "listing_photos_update"
  ON public.listing_photos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.rooms r
      JOIN public.properties p ON r.property_id = p.id
      JOIN public.landlords ll ON p.landlord_id = ll.id
      WHERE r.id = listing_id AND ll.profile_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- DELETE: Lister or Admin can delete
CREATE POLICY "listing_photos_delete"
  ON public.listing_photos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.rooms r
      JOIN public.properties p ON r.property_id = p.id
      JOIN public.landlords ll ON p.landlord_id = ll.id
      WHERE r.id = listing_id AND ll.profile_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Also ensure room_photos policies exist and are robust, since that's the new standard table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'room_photos') THEN
        DROP POLICY IF EXISTS "room_photos_select" ON public.room_photos;
        DROP POLICY IF EXISTS "room_photos_insert" ON public.room_photos;
        DROP POLICY IF EXISTS "room_photos_update" ON public.room_photos;
        DROP POLICY IF EXISTS "room_photos_delete" ON public.room_photos;

        CREATE POLICY "room_photos_select" ON public.room_photos FOR SELECT USING (true);
        CREATE POLICY "room_photos_insert" ON public.room_photos FOR INSERT WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.rooms r
                JOIN public.properties p ON r.property_id = p.id
                JOIN public.landlords ll ON p.landlord_id = ll.id
                WHERE r.id = room_id AND ll.profile_id = auth.uid()
            ) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        );
        CREATE POLICY "room_photos_update" ON public.room_photos FOR UPDATE USING (
            EXISTS (
                SELECT 1 FROM public.rooms r
                JOIN public.properties p ON r.property_id = p.id
                JOIN public.landlords ll ON p.landlord_id = ll.id
                WHERE r.id = room_id AND ll.profile_id = auth.uid()
            ) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        );
        CREATE POLICY "room_photos_delete" ON public.room_photos FOR DELETE USING (
            EXISTS (
                SELECT 1 FROM public.rooms r
                JOIN public.properties p ON r.property_id = p.id
                JOIN public.landlords ll ON p.landlord_id = ll.id
                WHERE r.id = room_id AND ll.profile_id = auth.uid()
            ) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        );
    END IF;
END $$;
