// ─────────────────────────────────────────────────────────────
// CampusStay TZ — Shared Type Definitions
// ─────────────────────────────────────────────────────────────

export type Role = 'student' | 'landlord' | 'dalali' | 'admin' | 'lister';
export type ListingStatus = 'active' | 'vacant' | 'paused' | 'removed';
export type InquiryStatus = 'pending' | 'accepted' | 'declined' | 'booked';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due';

export interface Profile {
  id: string;
  role: Role;
  full_name: string;
  phone: string;
  email?: string;
  occupation?: string;
  id_verified: boolean;
  id_document_url?: string;
  suspended: boolean;
  avg_rating: number;
  avatar_url?: string;
  profile_photo_url?: string;
  university?: string;
  lister_type?: string;
  verification_status?: string;
  preferred_language?: string;
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
  host_id: string;
  status: InquiryStatus;
  message: string;
  created_at: string;
  listing?: Partial<Listing>;
  tenant?: Partial<Profile>;
}

export interface Booking {
  id: string;
  inquiry_id: string;
  tenant_id: string;
  host_id: string;
  listing_id: string;
  amount: number;
  payment_ref?: string;
  payment_status: PaymentStatus;
  move_in_date?: string;
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
  icon: React.ReactNode;
}
