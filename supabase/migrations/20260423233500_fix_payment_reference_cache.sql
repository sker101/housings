-- Add payment_reference if it doesn't exist to fix schema cache error
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_reference TEXT UNIQUE;

-- Force PostgREST schema reload
NOTIFY pgrst, 'reload schema';
