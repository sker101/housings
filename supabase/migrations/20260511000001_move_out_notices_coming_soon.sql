-- ─────────────────────────────────────────────────────────────────────────────
-- Move-Out Notices + Coming Soon Listings
-- Migration: 20260511000001_move_out_notices_coming_soon.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── FIX: Add missing RLS policies on tenant_leases so tenants can read their own leases ──
-- The 20260418162759_platform_revolution.sql migration only added admin bypass.
-- Tenants need SELECT access to their own lease rows.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'tenant_leases' AND policyname = 'tenant reads own leases'
  ) THEN
    CREATE POLICY "tenant reads own leases" ON tenant_leases
      FOR SELECT
      USING (
        tenant_id IN (SELECT id FROM tenants WHERE profile_id = auth.uid())
      );
  END IF;
END $$;

-- Also allow tenants to INSERT/UPDATE their own lease rows (for renewal decision)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'tenant_leases' AND policyname = 'tenant updates own leases'
  ) THEN
    CREATE POLICY "tenant updates own leases" ON tenant_leases
      FOR UPDATE
      USING (
        tenant_id IN (SELECT id FROM tenants WHERE profile_id = auth.uid())
      );
  END IF;
END $$;

-- ── TABLE: move_out_notices ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS move_out_notices (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id              uuid NOT NULL REFERENCES tenant_leases(id) ON DELETE CASCADE,
  tenant_id             uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  landlord_id           uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  property_id           uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  room_id               uuid REFERENCES rooms(id) ON DELETE SET NULL,
  intended_move_out_date date NOT NULL,
  handover_notes        text,
  status                text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'listing_created', 'ignored')),
  landlord_notified_at  timestamptz,
  reminder_sent_at      timestamptz,
  created_at            timestamptz DEFAULT now()
);

ALTER TABLE move_out_notices ENABLE ROW LEVEL SECURITY;

-- Tenants: SELECT and INSERT where tenant_id = auth.uid()
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'move_out_notices' AND policyname = 'tenant select own notices'
  ) THEN
    CREATE POLICY "tenant select own notices" ON move_out_notices
      FOR SELECT USING (tenant_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'move_out_notices' AND policyname = 'tenant insert own notices'
  ) THEN
    CREATE POLICY "tenant insert own notices" ON move_out_notices
      FOR INSERT WITH CHECK (tenant_id = auth.uid());
  END IF;
END $$;

-- Landlords: SELECT and UPDATE where landlord_id = auth.uid()
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'move_out_notices' AND policyname = 'landlord select own notices'
  ) THEN
    CREATE POLICY "landlord select own notices" ON move_out_notices
      FOR SELECT USING (landlord_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'move_out_notices' AND policyname = 'landlord update own notices'
  ) THEN
    CREATE POLICY "landlord update own notices" ON move_out_notices
      FOR UPDATE USING (landlord_id = auth.uid());
  END IF;
END $$;

-- Admins: full access (matching existing pattern — role = 'admin' in profiles)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'move_out_notices' AND policyname = 'admin bypass move_out_notices'
  ) THEN
    CREATE POLICY "admin bypass move_out_notices" ON move_out_notices
      FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;

-- ── ALTER rooms TABLE: add coming-soon columns ─────────────────────────────────
-- rooms is the table storing individual listable units in the new schema

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS is_coming_soon          boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS available_from          date,
  ADD COLUMN IF NOT EXISTS coming_soon_activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS move_out_notice_id      uuid REFERENCES move_out_notices(id) ON DELETE SET NULL;

-- ── INDEX for landlord queries ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_move_out_notices_landlord_id ON move_out_notices(landlord_id);
CREATE INDEX IF NOT EXISTS idx_move_out_notices_tenant_id   ON move_out_notices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_move_out_notices_status      ON move_out_notices(status);
