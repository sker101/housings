-- Final sync of Admin Dashboard columns
-- This migration ensures all columns expected by the Admin React components exist in the database.

-- 1. listing_reports: Ensure admin_note exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'listing_reports' AND column_name = 'admin_note'
    ) THEN
        ALTER TABLE public.listing_reports ADD COLUMN admin_note text;
    END IF;
END $$;

-- 2. admin_audit_log: Ensure reason exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_audit_log' AND column_name = 'reason'
    ) THEN
        ALTER TABLE public.admin_audit_log ADD COLUMN reason text;
    END IF;
END $$;

-- 3. admin_audit_log: Ensure target_table exists (renamed from target_type in some versions)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_audit_log' AND column_name = 'target_table'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'admin_audit_log' AND column_name = 'target_type'
        ) THEN
            ALTER TABLE public.admin_audit_log RENAME COLUMN target_type TO target_table;
        ELSE
            ALTER TABLE public.admin_audit_log ADD COLUMN target_table text;
        END IF;
    END IF;
END $$;

-- Refresh PostgREST cache
NOTIFY pgrst, 'reload schema';
