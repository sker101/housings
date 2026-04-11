-- Expand room_type enum to support modern search preferences
-- We use ALTER TYPE ... ADD VALUE which is safe to run incrementally

ALTER TYPE public.room_type ADD VALUE IF NOT EXISTS 'self_contained';
ALTER TYPE public.room_type ADD VALUE IF NOT EXISTS '1_bedroom';
ALTER TYPE public.room_type ADD VALUE IF NOT EXISTS '2_bedroom';
ALTER TYPE public.room_type ADD VALUE IF NOT EXISTS 'guesthouse';
ALTER TYPE public.room_type ADD VALUE IF NOT EXISTS 'sq';

-- Migrate any existing 'bedsit' listings to 'studio' (as requested to remove Bedsit)
UPDATE public.listings 
SET room_type = 'studio' 
WHERE room_type = 'bedsit';
