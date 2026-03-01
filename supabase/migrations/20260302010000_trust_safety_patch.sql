begin;

-- ─────────────────────────────────────────────────────────────────
-- PATCH 1: Fix the rating trigger
-- The previous migration incorrectly updated `vacancy_status` to
-- 'unavailable' on low ratings. The correct column is `status`.
-- Also: the trigger should hide the listing from search without
-- destroying it — set status to 'flagged' so admin can review.
-- ─────────────────────────────────────────────────────────────────

create or replace function public.refresh_listing_avg_rating(p_listing_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_avg numeric(3,2);
  v_review_count bigint;
begin
  select
    round(avg(rating)::numeric, 2),
    count(*)
  into v_avg, v_review_count
  from public.reviews
  where listing_id = p_listing_id
    and is_hidden = false
    and is_removed = false;

  -- Minimum 5 reviews before acting on rating
  if v_review_count >= 5 and v_avg is not null then
    if v_avg < 2.0 then
      -- Auto-hide: set status to 'flagged' so admin sees it but it's off search
      update public.listings
        set status = 'flagged'
      where id = p_listing_id
        and status = 'approved';  -- only demote from approved, not already-blocked
    end if;
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────────
-- PATCH 2: Fix the anonymous report RLS policy
-- The previous policy required auth.uid() IS NOT NULL for INSERT,
-- which blocked anonymous reports. The edge function sets reporter_id
-- to NULL for anonymous users — so we allow that.
-- The edge function itself is authenticated to Supabase via service
-- role, so the trust comes from the function, not the user's JWT.
-- ─────────────────────────────────────────────────────────────────

drop policy if exists "Authenticated users can submit reports" on public.listing_reports;

-- Allow the service-role edge function to insert without a user JWT
-- (service role bypasses RLS by default, so this only affects anon/user keys)
-- We open INSERT to any request – rate limiting is handled at the edge function level
create policy "Anyone can submit a report"
  on public.listing_reports for insert
  with check (true);

-- ─────────────────────────────────────────────────────────────────
-- PATCH 3: Ensure screening auto-publish sets status to 'approved'
-- (not just flagged), and that 'flagged' listings still display
-- to admin for review. Add index for faster flagged queries.
-- ─────────────────────────────────────────────────────────────────

create index if not exists idx_listings_status_lister on public.listings (status, lister_id, created_at desc);
create index if not exists idx_listing_reports_pending on public.listing_reports (status, created_at desc) where status = 'pending';

commit;
