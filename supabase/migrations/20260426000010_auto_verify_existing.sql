-- AUTO-VERIFY LANDLORDS AND PROPERTIES
-- This migration ensures that existing landlords and their properties are marked as verified
-- so they show up on the map immediately.

DO $$
BEGIN
    -- 1. Mark all existing landlords as identity verified
    UPDATE public.landlords
    SET identity_verified = true;

    -- 2. Mark all existing properties as verified
    UPDATE public.properties
    SET verification_status = 'verified'
    WHERE verification_status IS NULL OR verification_status = 'unverified';

    RAISE NOTICE 'Auto-verified all existing landlords and properties.';
END $$;
