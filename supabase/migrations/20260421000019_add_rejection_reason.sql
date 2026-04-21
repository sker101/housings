-- Schema enhancement for moderation
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS rejection_reason text;
