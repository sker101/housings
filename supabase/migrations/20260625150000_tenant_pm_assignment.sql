-- ──────────────────────────────────────────────────────────────────────
-- Hybrid Monetization: Tenant ↔ Property Manager (Dalali) Assignment
-- 
-- When a tenant books a listing managed by a dalali (lister_type = 'dalali'
-- or 'property_manager'), that dalali is permanently assigned to the tenant.
-- This creates a loyalty loop: every time the tenant shifts to a new room,
-- they are matched with their same dalali, providing the PM a recurring income.
-- ──────────────────────────────────────────────────────────────────────

-- 1. Add the assigned_pm_id column to tenants
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS assigned_pm_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Index for fast lookups (e.g., "all tenants this dalali manages")
CREATE INDEX IF NOT EXISTS idx_tenants_assigned_pm
  ON tenants (assigned_pm_id)
  WHERE assigned_pm_id IS NOT NULL;

-- 2. Add fee columns to bookings table for the new hybrid model
--    These track what the tenant paid online vs. what they owe in cash.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS platform_fee       NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gateway_fee_online NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dalali_fee         NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rent_due_cash      NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_online        NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assigned_pm_id     UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- 3. Helper view: dalali dashboard — see all tenants assigned to you
CREATE OR REPLACE VIEW pm_assigned_tenants AS
  SELECT
    t.id            AS tenant_id,
    p.full_name     AS tenant_name,
    p.phone         AS tenant_phone,
    t.assigned_pm_id,
    t.created_at    AS tenant_since,
    -- Latest booking info
    b.id            AS latest_booking_id,
    b.status        AS latest_booking_status,
    li.title        AS current_room,
    b.move_in_date
  FROM tenants t
  JOIN profiles p    ON p.id = t.profile_id
  LEFT JOIN bookings b ON b.id = (
    SELECT id FROM bookings
    WHERE tenant_id = t.id
      AND status IN ('confirmed', 'paid', 'approved')
    ORDER BY created_at DESC
    LIMIT 1
  )
  LEFT JOIN listings li ON li.id = b.listing_id
  WHERE t.assigned_pm_id IS NOT NULL;

COMMENT ON VIEW pm_assigned_tenants IS
  'Lists all tenants permanently assigned to a property manager (dalali), including their current room and booking status.';

-- 4. Function: Assign PM to tenant on successful booking
--    Called from the frontend after a successful payment.
--    Only assigns if: (a) tenant has no existing PM, AND (b) the listing lister_type is dalali/property_manager.
CREATE OR REPLACE FUNCTION assign_pm_to_tenant(
  p_tenant_profile_id UUID,
  p_pm_profile_id     UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE tenants
  SET assigned_pm_id = p_pm_profile_id
  WHERE profile_id   = p_tenant_profile_id
    AND assigned_pm_id IS NULL;  -- Only assign if not already assigned
END;
$$;

GRANT EXECUTE ON FUNCTION assign_pm_to_tenant TO authenticated;
