-- Migration to fix missing RLS policies for tenants and payments tables
-- These are required for the checkout and payment flow to succeed

-- Tenants table policies
CREATE POLICY "tenant own profile select" 
ON tenants FOR SELECT 
USING (profile_id = auth.uid());

CREATE POLICY "tenant own profile insert" 
ON tenants FOR INSERT 
WITH CHECK (profile_id = auth.uid());

CREATE POLICY "tenant own profile update" 
ON tenants FOR UPDATE 
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

-- Payments table policies
CREATE POLICY "tenant own payments select" 
ON payments FOR SELECT 
USING (tenant_id IN (SELECT id FROM tenants WHERE profile_id = auth.uid()));

CREATE POLICY "tenant own payments insert" 
ON payments FOR INSERT 
WITH CHECK (tenant_id IN (SELECT id FROM tenants WHERE profile_id = auth.uid()));

-- Landlords table policies (just in case they are missing too)
CREATE POLICY "landlord own profile select" 
ON landlords FOR SELECT 
USING (profile_id = auth.uid());

CREATE POLICY "landlord own profile insert" 
ON landlords FOR INSERT 
WITH CHECK (profile_id = auth.uid());

CREATE POLICY "landlord own profile update" 
ON landlords FOR UPDATE 
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

-- Landlords viewing payments for their properties
CREATE POLICY "landlord view property payments"
ON payments FOR SELECT
USING (booking_id IN (
    SELECT id FROM bookings WHERE landlord_id IN (
        SELECT id FROM landlords WHERE profile_id = auth.uid()
    )
));
