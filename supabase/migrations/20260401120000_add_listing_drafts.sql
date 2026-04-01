
-- 20260401120000_add_listing_drafts.sql
-- Create the listing_drafts table to support autosave functionality

CREATE TABLE IF NOT EXISTS "public"."listing_drafts" (
    "lister_id" UUID PRIMARY KEY REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
    "current_step" INTEGER NOT NULL DEFAULT 1,
    "data" JSONB NOT NULL DEFAULT '{}'::JSONB,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE "public"."listing_drafts" ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Listers can manage their own drafts"
ON "public"."listing_drafts"
FOR ALL
TO authenticated
USING (auth.uid() = lister_id)
WITH CHECK (auth.uid() = lister_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_listing_drafts_updated_at
BEFORE UPDATE ON "public"."listing_drafts"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
