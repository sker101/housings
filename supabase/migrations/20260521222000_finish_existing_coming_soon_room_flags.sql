-- 20260521222000_finish_existing_coming_soon_room_flags.sql
-- Complete the room flag repair for rows already renamed by the previous repair.

WITH candidates AS (
  SELECT DISTINCT ON (cs.id)
    cs.id AS new_room_id,
    n.id AS notice_id,
    n.intended_move_out_date,
    b.listing_id AS original_room_id
  FROM public.move_out_notices n
  JOIN public.bookings b ON b.id = n.booking_id
  JOIN public.listings orig ON orig.id = b.listing_id
  JOIN public.listings cs
    ON cs.lister_id = orig.lister_id
   AND cs.price_monthly = orig.price_monthly
   AND cs.title = orig.title || ' (Coming Soon)'
   AND cs.created_at >= n.created_at
  WHERE n.status = 'listing_created'
  ORDER BY cs.id, n.created_at DESC
)
UPDATE public.rooms r
   SET availability_status = 'listed_occupied',
       is_available = false,
       is_coming_soon = true,
       available_from = candidates.intended_move_out_date,
       coming_soon_activated_at = COALESCE(r.coming_soon_activated_at, now()),
       move_out_notice_id = candidates.notice_id
  FROM candidates
 WHERE r.id = candidates.new_room_id;

WITH candidates AS (
  SELECT DISTINCT ON (cs.id)
    cs.id AS new_room_id,
    n.id AS notice_id,
    n.intended_move_out_date,
    b.listing_id AS original_room_id
  FROM public.move_out_notices n
  JOIN public.bookings b ON b.id = n.booking_id
  JOIN public.listings orig ON orig.id = b.listing_id
  JOIN public.listings cs
    ON cs.lister_id = orig.lister_id
   AND cs.price_monthly = orig.price_monthly
   AND cs.title = orig.title || ' (Coming Soon)'
   AND cs.created_at >= n.created_at
  WHERE n.status = 'listing_created'
  ORDER BY cs.id, n.created_at DESC
)
UPDATE public.rooms r
   SET is_coming_soon = true,
       available_from = candidates.intended_move_out_date,
       coming_soon_activated_at = COALESCE(r.coming_soon_activated_at, now()),
       move_out_notice_id = candidates.notice_id
  FROM candidates
 WHERE r.id = candidates.original_room_id;

NOTIFY pgrst, 'reload schema';
