import {
  deleteRows,
  insertRows,
  selectRows,
  upsertRows,
  updateRows,
  rpc
} from './supabase';
import { logActivity } from './activity';

function toLocation(row) {
  return [row.street, row.ward, row.district, row.region]
    .map(s => s ? String(s).trim() : '')
    .filter(Boolean)
    .join(', ');
}

function normalizeAmenities(value) {
  if (!value) {
    return {};
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

export function mapListingRow(row, photos = []) {
  const price = Number(row.price_monthly || 0);

  return {
    id: row.id,
    title: (row.title && String(row.title).trim() !== '') ? String(row.title).trim() : (row.room_type ? `${String(row.room_type).replace(/_/g, ' ').replace(/\\b\\w/g, c => c.toUpperCase())} Room` : 'Room for rent'),
    description: row.description,
    roomType: row.room_type,
    // Note: gender_preference column doesn't exist in database view - hardcoded as 'mixed'
    genderPreference: 'mixed',
    location: toLocation(row),
    region: row.region,
    district: row.district,
    ward: row.ward,
    street: row.street,
    priceMonthly: price,
    securityDeposit: 0, // Not in database schema
    utilitiesIncluded: false,
    floor: null, // Not in database schema
    totalRooms: null, // Not in database schema
    furnished: false, // Not in database schema
    propertyType: null, // Not in database schema
    ownerName: null, // Not in database schema
    ownerPhone: null, // Not in database schema
    whatsappNumber: null, // Not in database schema
    minLeaseMonths: 1, // Not in database schema
    paymentSchedule: 'monthly', // Not in database schema
    lateFeePolicy: null, // Not in database schema
    videoTourUrl: null, // Not in database schema
    accessibilityNotes: null, // Not in database schema
    amenities: normalizeAmenities(row.amenities),
    houseRules: row.house_rules,
    availableFrom: row.available_from,
    vacancyStatus: row.vacancy_status,
    status: row.status,
    featured: Boolean(row.featured),
    nearUniversities: Array.isArray(row.near_universities)
      ? row.near_universities
      : [],
    lat: row.lat,
    lng: row.lng,
    listerId: row.lister_id,
    rejectionReason: row.rejection_reason,
    viewCount: Number(row.view_count || 0),
    createdAt: row.created_at,
    photos,
    imageUrl:
      photos.find((photo) => Boolean(photo?.public_url))?.public_url ||
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
    verified: row.status === 'approved'
  };
}


async function fetchPhotosForListings(listingIds, accessToken) {
  if (!Array.isArray(listingIds) || listingIds.length === 0) {
    return new Map();
  }

  const photos = await selectRows('listing_photos', {
    select: 'id,listing_id,angle,public_url,created_at',
    filters: [
      {
        column: 'listing_id',
        op: 'in',
        value: `(${listingIds.join(',')})`
      }
    ],
    order: 'created_at.asc',
    accessToken
  });

  const grouped = new Map();
  photos.forEach((photo) => {
    const list = grouped.get(photo.listing_id) || [];
    list.push(photo);
    grouped.set(photo.listing_id, list);
  });

  return grouped;
}

export async function fetchApprovedListings(filters: Record<string, any> = {}, accessToken?: string) {
  const queryFilters = [{ column: 'status', op: 'eq', value: 'approved' }];

  // Hide occupied listings from search results
  queryFilters.push({ column: 'vacancy_status', op: 'neq', value: 'occupied' });

  // Note: gender_preference is hardcoded as 'mixed' in the database view
  // Gender filtering is disabled until the database schema supports it
  if (filters.roomType && filters.roomType !== 'all') {
    queryFilters.push({
      column: 'room_type',
      op: 'eq',
      value: filters.roomType
    });
  }

  if (filters.minPrice != null && filters.minPrice !== '') {
    queryFilters.push({
      column: 'price_monthly',
      op: 'gte',
      value: Number(filters.minPrice) as any
    });
  }

  if (filters.maxPrice != null && filters.maxPrice !== '') {
    queryFilters.push({
      column: 'price_monthly',
      op: 'lte',
      value: Number(filters.maxPrice) as any
    });
  }

  let order = 'featured.desc,created_at.desc';

  if (filters.sort === 'price_asc') {
    order = 'price_monthly.asc';
  } else if (filters.sort === 'price_desc') {
    order = 'price_monthly.desc';
  } else if (filters.sort === 'newest') {
    order = 'created_at.desc';
  }

  const rows = await selectRows('listings', {
    select:
      '*',
    filters: queryFilters,
    or: filters.query
      ? `title.ilike.*${filters.query}*,district.ilike.*${filters.query}*,ward.ilike.*${filters.query}*`
      : undefined,
    order,
    limit: filters.limit || 60,
    offset: filters.offset || 0,
    accessToken
  });

  const photoMap = await fetchPhotosForListings(
    rows.map((row) => row.id),
    accessToken
  );

  return rows.map((row) => mapListingRow(row, photoMap.get(row.id) || []));
}

export async function fetchListingById(listingId, accessToken) {
  let listingRow;
  let listerProfile = null;

  try {
    const result = await rpc('get_listing_with_contact', { p_listing_id: listingId }, accessToken);
    if (result && result.listing) {
      listingRow = result.listing;
      listerProfile = result.listerProfile;
    } else {
      throw new Error('Listing not found');
    }
  } catch (err) {
    console.warn('RPC failed, falling back to selectRows', err);
    const rows = await selectRows('listings', {
      select:
        '*',
      filters: [{ column: 'id', op: 'eq', value: listingId }],
      limit: 1,
      accessToken
    });

    if (rows.length === 0) {
      throw new Error('Listing not found');
    }

    listingRow = rows[0];

    if (listingRow.lister_id) {
      const profiles = await selectRows('profiles', {
        select: 'id,full_name,verification_status,profile_photo_url,created_at,phone',
        filters: [{ column: 'id', op: 'eq', value: listingRow.lister_id }],
        limit: 1,
        accessToken
      });
      listerProfile = profiles[0] || null;
    }
  }

  const photoMap = await fetchPhotosForListings([listingRow.id], accessToken);

  return {
    listing: mapListingRow(listingRow, photoMap.get(listingRow.id) || []),
    listerProfile
  };
}

export async function fetchRelatedListings(baseListing, accessToken, limit = 6) {
  if (!baseListing?.id) {
    return [];
  }

  const selectColumns = '*';

  const basePrice = Number(baseListing.priceMonthly || 0);
  const minPrice = Math.max(0, Math.round(basePrice * 0.7));
  const maxPrice = Math.max(minPrice, Math.round(basePrice * 1.3));

  const preferredFilters = [
    { column: 'status', op: 'eq', value: 'approved' },
    { column: 'vacancy_status', op: 'neq', value: 'occupied' },
    { column: 'id', op: 'neq', value: baseListing.id },
    baseListing.district
      ? { column: 'district', op: 'eq', value: baseListing.district }
      : null,
    { column: 'price_monthly', op: 'gte', value: minPrice },
    { column: 'price_monthly', op: 'lte', value: maxPrice }
  ].filter(Boolean);

  let rows = await selectRows('listings', {
    select: selectColumns,
    filters: preferredFilters,
    order: 'featured.desc,created_at.desc',
    limit: limit + 4,
    accessToken
  });

  if (rows.length < limit) {
    const fallbackFilters = [
      { column: 'status', op: 'eq', value: 'approved' },
      { column: 'vacancy_status', op: 'neq', value: 'occupied' },
      { column: 'id', op: 'neq', value: baseListing.id },
      baseListing.region
        ? { column: 'region', op: 'eq', value: baseListing.region }
        : null
    ].filter(Boolean);

    const fallbackRows = await selectRows('listings', {
      select: selectColumns,
      filters: fallbackFilters,
      order: 'featured.desc,created_at.desc',
      limit: limit + 6,
      accessToken
    });

    rows = [...rows, ...fallbackRows];
  }

  const dedupedRows = [];
  const seen = new Set();

  rows.forEach((row) => {
    if (!row?.id || seen.has(row.id)) {
      return;
    }

    seen.add(row.id);
    dedupedRows.push(row);
  });

  const picked = dedupedRows.slice(0, limit);
  const photoMap = await fetchPhotosForListings(
    picked.map((row) => row.id),
    accessToken
  );

  return picked.map((row) => mapListingRow(row, photoMap.get(row.id) || []));
}

export async function toggleSavedListing({ tenantId, listingId, accessToken }) {
  const existing = await selectRows('saved_listings', {
    select: 'tenant_id,listing_id,saved_at',
    filters: [
      { column: 'tenant_id', op: 'eq', value: tenantId },
      { column: 'listing_id', op: 'eq', value: listingId }
    ],
    limit: 1,
    accessToken
  });

  if (existing.length > 0) {
    await deleteRows('saved_listings', {
      filters: [
        { column: 'tenant_id', op: 'eq', value: tenantId },
        { column: 'listing_id', op: 'eq', value: listingId }
      ],
      accessToken
    });
    // Record activity
    await logActivity(
      tenantId,
      'interaction',
      'Removed a listing from your saved rooms',
      { listing_id: listingId, action: 'unsave' },
      accessToken
    );
    return false;
  }

  await insertRows(
    'saved_listings',
    {
      tenant_id: tenantId,
      listing_id: listingId
    },
    { accessToken }
  );

  // Record activity
  await logActivity(
    tenantId,
    'interaction',
    'Saved a new listing to your collection',
    { listing_id: listingId, action: 'save' },
    accessToken
  );

  return true;
}

export async function fetchSavedListings(tenantId, accessToken, options: { limit?: number } = {}) {
  const saved = await selectRows('saved_listings', {
    select: 'tenant_id,listing_id,saved_at',
    filters: [{ column: 'tenant_id', op: 'eq', value: tenantId }],
    order: 'saved_at.desc',
    limit: options.limit,
    accessToken
  });

  const listingIds = saved.map((item) => item.listing_id);
  if (listingIds.length === 0) {
    return [];
  }

  const listings = await selectRows('listings', {
    select:
      '*',
    filters: [
      {
        column: 'id',
        op: 'in',
        value: `(${listingIds.join(',')})`
      }
    ],
    accessToken
  });

  const photoMap = await fetchPhotosForListings(
    listings.map((row) => row.id),
    accessToken
  );

  const listingMap = new Map(
    listings.map((row) => [row.id, mapListingRow(row, photoMap.get(row.id) || [])])
  );

  return saved
    .map((savedItem) => ({
      savedAt: savedItem.saved_at,
      listing: listingMap.get(savedItem.listing_id)
    }))
    .filter((item) => Boolean(item.listing));
}

export async function fetchSavedListingIds(tenantId, accessToken) {
  const rows = await selectRows('saved_listings', {
    select: 'listing_id',
    filters: [{ column: 'tenant_id', op: 'eq', value: tenantId }],
    accessToken
  });

  return rows.map((row) => row.listing_id).filter(Boolean);
}

export async function updateListingStatus({
  listingId,
  status,
  reason,
  accessToken
}) {
  const payload: Record<string, any> = { status };

  if (reason != null) {
    payload.rejection_reason = reason;
  }

  const rows = await updateRows('listings', payload, {
    filters: [{ column: 'id', op: 'eq', value: listingId }],
    accessToken
  });

  return rows[0] || null;
}

async function fetchProfilesByIds(profileIds, accessToken) {
  if (!Array.isArray(profileIds) || profileIds.length === 0) {
    return new Map();
  }

  const rows = await selectRows('profiles', {
    select: 'id,full_name,profile_photo_url',
    filters: [{ column: 'id', op: 'in', value: `(${profileIds.join(',')})` }],
    accessToken
  });

  return new Map(rows.map((row) => [row.id, row]));
}

export async function fetchListingReviews(listingId, accessToken) {
  if (!listingId) {
    return [];
  }

  // Fetch reviews using any available table name (reviews or listing_reviews)
  let rows = [];
  try {
    rows = await selectRows('reviews', {
      select: '*',
      filters: [{ column: 'listing_id', op: 'eq', value: listingId }],
      order: 'created_at.desc',
      limit: 100,
      accessToken
    });
  } catch {
    try {
      rows = await selectRows('reviews', {
        select: '*',
        filters: [{ column: 'room_id', op: 'eq', value: listingId }],
        order: 'created_at.desc',
        limit: 100,
        accessToken
      });
    } catch {
      try {
        rows = await selectRows('listing_reviews', {
          select: '*',
          filters: [{ column: 'listing_id', op: 'eq', value: listingId }],
          order: 'created_at.desc',
          limit: 100,
          accessToken
        });
      } catch {
        rows = [];
      }
    }
  }

  const authorMap = await fetchProfilesByIds(
    rows.map((row) => row.tenant_id).filter(Boolean),
    accessToken
  );

  return rows.map((row) => ({
    id: row.id,
    listingId: row.listing_id,
    tenantId: row.tenant_id,
    rating: Number(row.rating || 0),
    comment: row.comment || '',
    createdAt: row.created_at,
    authorName: authorMap.get(row.tenant_id)?.full_name || 'Verified tenant',
    authorPhotoUrl: authorMap.get(row.tenant_id)?.profile_photo_url || ''
  }));
}

export async function upsertListingReview({
  listingId,
  tenantId,
  rating,
  comment,
  accessToken
}) {
  const rows = await upsertRows(
    'reviews',
    {
      listing_id: listingId,
      tenant_id: tenantId,
      rating: Number(rating),
      comment: String(comment || '').trim()
    },
    {
      onConflict: 'listing_id,tenant_id',
      accessToken
    }
  );

  return rows[0] || null;
}

export async function createBookingRequest({
  listingId,
  tenantId,
  listerId,
  moveInDate,
  durationMonths,
  message,
  contactPreference,
  accessToken
}) {
  const rows = await insertRows(
    'bookings',
    {
      listing_id: listingId,
      tenant_id: tenantId,
      lister_id: listerId,
      move_in_date: moveInDate,
      months_duration: Number(durationMonths),
      message: String(message || '').trim(),
      contact_preference: contactPreference || 'in_app_chat',
      status: 'requested'
    },
    { accessToken }
  );

  return rows[0] || null;
}

export async function fetchListingBookingsForUser({
  listingId,
  userId,
  accessToken
}) {
  if (!listingId || !userId) {
    return [];
  }

  // NOTE: In the new schema, bookings table uses 'room_id' instead of 'listing_id'
  // and tenant_id/lister_id are references to their respective role tables, 
  // but many queries still use profile_id. We check the column names here.
  const rows = await selectRows('bookings', {
    select:
      'id,listing_id,tenant_id,landlord_id,move_in_date,months_duration,status,created_at',
    filters: [
      { column: 'listing_id', op: 'eq', value: listingId }
    ],
    or: `tenant_id.eq.${userId}`,
    order: 'created_at.desc',
    limit: 1,
    accessToken
  });

  const profiles = await fetchProfilesByIds(
    rows
      .flatMap((row) => [row.tenant_id, row.landlord_id])
      .filter(Boolean),
    accessToken
  );

  return rows.map((row) => ({
    id: row.id,
    listingId: row.listing_id,
    tenantId: row.tenant_id,
    landlordId: row.landlord_id,
    moveInDate: row.move_in_date,
    durationMonths: Number(row.months_duration || 0),
    message: row.message || '',
    contactPreference: row.contact_preference || 'in_app_chat',
    status: row.status || 'requested',
    createdAt: row.created_at,
    updatedAt: row.created_at,
    tenantName: profiles.get(row.tenant_id)?.full_name || 'Tenant',
    landlordName: profiles.get(row.landlord_id)?.full_name || 'Landlord'
  }));
}

export async function updateBookingStatus({
  bookingId,
  status,
  accessToken
}) {
  const rows = await updateRows(
    'bookings',
    { status },
    {
      filters: [{ column: 'id', op: 'eq', value: bookingId }],
      accessToken
    }
  );

  return rows[0] || null;
}

export async function fetchPaymentRecordsForBookings(bookingIds, accessToken) {
  if (!Array.isArray(bookingIds) || bookingIds.length === 0) {
    return [];
  }

  const rows = await selectRows('payment_records', {
    select:
      'id,booking_id,amount,due_date,status,paid_at,receipt_url,created_at,updated_at',
    filters: [{ column: 'booking_id', op: 'in', value: `(${bookingIds.join(',')})` }],
    order: 'due_date.asc',
    accessToken
  });

  return rows.map((row) => ({
    id: row.id,
    bookingId: row.booking_id,
    amount: Number(row.amount || 0),
    dueDate: row.due_date,
    status: row.status || 'pending',
    paidAt: row.paid_at,
    receiptUrl: row.receipt_url || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

export async function markPaymentRecordPaid({
  paymentRecordId,
  receiptUrl,
  accessToken
}) {
  const rows = await updateRows(
    'payment_records',
    {
      status: 'paid',
      paid_at: new Date().toISOString(),
      receipt_url: receiptUrl || null
    },
    {
      filters: [{ column: 'id', op: 'eq', value: paymentRecordId }],
      accessToken
    }
  );

  return rows[0] || null;
}
