// ─────────────────────────────────────────────────────────────
// iRent — Shared Type Definitions
// ─────────────────────────────────────────────────────────────

import type { ReactNode } from 'react';

export type Role = 'student' | 'landlord' | 'dalali' | 'admin' | 'lister';
export type ListingStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'flagged' | 'suspended';
export type InquiryStatus = 'open' | 'interested' | 'unavailable' | 'booked';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type BookingStatus = 'requested' | 'approved' | 'declined' | 'cancelled' | 'completed';
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due';

export interface Profile {
  id: string;
  role: Role;
  lister_type?: string;
  full_name: string;
  phone: string;
  phone_verified?: boolean;
  email?: string;
  id_document_url?: string;
  selfie_url?: string;
  suspended: boolean;
  profile_photo_url?: string;
  university?: string;
  verification_status?: string;
  subscription_plan?: string;
  preferred_language?: string;
  commission_rate_pct?: number;
  created_at: string;
}

export interface Listing {
  id: string;
  owner_id: string;
  owner_role?: 'landlord' | 'dalali';
  title: string;
  description: string;
  price: number;
  area?: string;
  location?: string;
  district?: string;
  ward?: string;
  lat?: number;
  lng?: number;
  status: ListingStatus;
  photos?: string[];
  amenities?: string[];
  views?: number;
  room_type?: string;
  created_at: string;
}

export interface Inquiry {
  id: string;
  listing_id: string;
  tenant_id: string;
  lister_id: string;
  status: InquiryStatus;
  message: string;
  created_at: string;
  listing?: Partial<Listing>;
  tenant?: Partial<Profile>;
}

export interface Booking {
  id: string;
  tenant_id: string;
  lister_id: string;
  listing_id: string;
  amount: number;
  reference?: string;
  payment_status: PaymentStatus;
  status?: BookingStatus;
  move_in_date?: string;
  duration_months?: number;
  created_at: string;
  listing?: Partial<Listing>;
  tenant?: Partial<Profile>;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan: string;
  status: SubscriptionStatus;
  current_period_end: string;
  selcom_ref?: string;
  created_at: string;
}

export interface Review {
  id: string;
  booking_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer?: Partial<Profile>;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  event_type: string;
  description: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────
// AuthContext shape (for use in hooks / components)
// ─────────────────────────────────────────────────────────────
export interface AuthUser {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  phoneVerified: boolean;
  role: string;
  roleRaw: string;
  listerType: string;
  landlordVerificationStatus: string;
  university: string;
  preferredLanguage: string;
}

// ─────────────────────────────────────────────────────────────
// Navigation item for DashboardLayout
// ─────────────────────────────────────────────────────────────
export interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
}
