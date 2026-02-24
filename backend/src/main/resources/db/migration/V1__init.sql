CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(40) NOT NULL,
    role VARCHAR(30) NOT NULL,
    account_status VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uk_user_email UNIQUE (email)
);

CREATE TABLE universities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(30) NOT NULL,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(255) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uk_university_code UNIQUE (code)
);

CREATE TABLE landlord_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    identity_document_placeholder VARCHAR(255) NOT NULL,
    verification_status VARCHAR(30) NOT NULL,
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    review_notes VARCHAR(1000),
    subscription_plan VARCHAR(30) NOT NULL,
    commission_rate_percent NUMERIC(5,2),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uk_landlord_user UNIQUE (user_id),
    CONSTRAINT fk_landlord_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_landlord_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

CREATE TABLE listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landlord_id UUID NOT NULL,
    university_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    title_normalized VARCHAR(255) NOT NULL,
    description VARCHAR(5000) NOT NULL,
    address VARCHAR(255) NOT NULL,
    address_normalized VARCHAR(255) NOT NULL,
    rent_amount NUMERIC(12,2) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    bedrooms INTEGER NOT NULL,
    bathrooms INTEGER NOT NULL,
    occupancy_type VARCHAR(30) NOT NULL,
    listing_status VARCHAR(30) NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    promotion_level VARCHAR(30) NOT NULL,
    promotion_expires_at TIMESTAMPTZ,
    commission_tracking_status VARCHAR(30) NOT NULL,
    commission_amount NUMERIC(12,2),
    flagged BOOLEAN NOT NULL DEFAULT FALSE,
    flagged_reason VARCHAR(1000),
    rejected_reason VARCHAR(1000),
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT fk_listing_landlord FOREIGN KEY (landlord_id) REFERENCES users(id),
    CONSTRAINT fk_listing_university FOREIGN KEY (university_id) REFERENCES universities(id),
    CONSTRAINT fk_listing_approved_by FOREIGN KEY (approved_by) REFERENCES users(id)
);

CREATE INDEX idx_listing_status_university ON listings(listing_status, university_id);
CREATE INDEX idx_listing_landlord ON listings(landlord_id);
CREATE INDEX idx_listing_featured ON listings(featured);
CREATE INDEX idx_listing_duplicate_guard ON listings(university_id, address_normalized, title_normalized);
CREATE INDEX idx_landlord_status ON landlord_profiles(verification_status);
