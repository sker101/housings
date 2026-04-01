-- Fix listing_drafts step constraint: was max 5, form now has 7 steps
ALTER TABLE public.listing_drafts
  DROP CONSTRAINT IF EXISTS listing_drafts_current_step_check;

ALTER TABLE public.listing_drafts
  ADD CONSTRAINT listing_drafts_current_step_check
  CHECK (current_step >= 1 AND current_step <= 10);
