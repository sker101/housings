-- Create bookings table with room_id (matching source table)
CREATE TABLE IF NOT EXISTS bookings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id uuid REFERENCES rooms(id), -- Points to source table
    tenant_id uuid REFERENCES tenants(id),
    landlord_id uuid,
    property_id uuid,
    move_in_date date,
    months_duration integer,
    total_tzs integer,
    platform_deposit_fee numeric DEFAULT 0,
    gateway_fee numeric DEFAULT 0,
    total_amount_due numeric DEFAULT 0,
    status text DEFAULT 'pending',
    reference text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Allow all" ON bookings;
CREATE POLICY "Allow all" ON bookings FOR ALL USING (true) WITH CHECK (true);

-- Create tenant_leases table if not exists
CREATE TABLE IF NOT EXISTS tenant_leases (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id uuid REFERENCES rooms(id), -- Points to source table
    tenant_id uuid REFERENCES tenants(id),
    landlord_id uuid,
    lease_start_date date, -- Renamed for consistency
    lease_end_date date,
    months_duration integer,
    total_amount_due numeric DEFAULT 0,
    platform_deposit_fee numeric DEFAULT 0,
    gateway_fee numeric DEFAULT 0,
    status text DEFAULT 'active',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE tenant_leases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON tenant_leases;
CREATE POLICY "Allow all" ON tenant_leases FOR ALL USING (true) WITH CHECK (true);
