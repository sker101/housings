import {
  deleteRows,
  insertRows,
  selectRows,
  upsertRows,
  updateRows
} from './supabase';

function toLocation(row) {
  return [row.street, row.ward, row.district, row.region].filter(Boolean).join(', ');
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
    title: row.title,
    description: row.description,
    roomType: row.room_type,
    genderPreference: row.gender_preference,
    location: toLocation(row),
    region: row.region,
    district: row.district,
    ward: row.ward,
    street: row.street,
    priceMonthly: price,
    securityDeposit: Number(row.security_deposit || 0),
    utilitiesIncluded: Boolean(row.utilities_included),
    floor: row.floor || null,
    totalRooms: row.total_rooms || null,
    furnished: Boolean(row.furnished),
    propertyType: row.property_type || null,
    ownerName: row.owner_name || null,
    ownerPhone: row.owner_phone || null,
    whatsappNumber: row.whatsapp_number || null,
    minLeaseMonths: Number(row.min_lease_months || 1),
    paymentSchedule: row.payment_schedule || 'monthly',
    lateFeePolicy: row.late_fee_policy || null,
    videoTourUrl: row.video_tour_url || null,
    accessibilityNotes: row.accessibility_notes || null,
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
    select: 'id,listing_id,angle,public_url,ai_verified,ai_confidence,position,caption,is_cover',
    filters: [
      {
        column: 'listing_id',
        op: 'in',
        value: `(${listingIds.join(',')})`
      }
    ],
    order: 'position.asc,created_at.asc',
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

  if (filters.genderPreference && filters.genderPreference !== 'any') {
    queryFilters.push({
      column: 'gender_preference',
      op: 'eq',
      value: filters.genderPreference
    });
  }

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
      'id,lister_id,title,description,room_type,gender_preference,price_monthly,security_deposit,utilities_included,floor,total_rooms,furnished,property_type,owner_name,owner_phone,whatsapp_number,min_lease_months,payment_schedule,late_fee_policy,video_tour_url,accessibility_notes,region,district,ward,street,lat,lng,amenities,house_rules,available_from,vacancy_status,status,rejection_reason,featured,near_universities,view_count,created_at',
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
  const rows = await selectRows('listings', {
    select:
      'id,lister_id,title,description,room_type,gender_preference,price_monthly,security_deposit,utilities_included,floor,total_rooms,furnished,property_type,owner_name,owner_phone,whatsapp_number,min_lease_months,payment_schedule,late_fee_policy,video_tour_url,accessibility_notes,region,district,ward,street,lat,lng,amenities,house_rules,available_from,vacancy_status,status,rejection_reason,featured,near_universities,view_count,created_at',
    filters: [{ column: 'id', op: 'eq', value: listingId }],
    limit: 1,
    accessToken
  });

  if (rows.length === 0) {
    throw new Error('Listing not found');
  }

  const listingRow = rows[0];
  const photoMap = await fetchPhotosForListings([listingRow.id], accessToken);

  let listerProfile = null;
  if (listingRow.lister_id) {
    const profiles = await selectRows('profiles', {
      select: 'id,full_name,verification_status,profile_photo_url,created_at',
      filters: [{ column: 'id', op: 'eq', value: listingRow.lister_id }],
      limit: 1,
      accessToken
    });

    listerProfile = profiles[0] || null;
  }

  return {
    listing: mapListingRow(listingRow, photoMap.get(listingRow.id) || []),
    listerProfile
  };
}

export async function fetchRelatedListings(baseListing, accessToken, limit = 6) {
  if (!baseListing?.id) {
    return [];
  }

  const selectColumns =
    'id,lister_id,title,description,room_type,gender_preference,price_monthly,security_deposit,utilities_included,floor,total_rooms,furnished,property_type,owner_name,owner_phone,whatsapp_number,min_lease_months,payment_schedule,late_fee_policy,video_tour_url,accessibility_notes,region,district,ward,street,lat,lng,amenities,house_rules,available_from,vacancy_status,status,rejection_reason,featured,near_universities,view_count,created_at';

  const basePrice = Number(baseListing.priceMonthly || 0);
  const minPrice = Math.max(0, Math.round(basePrice * 0.7));
  const maxPrice = Math.max(minPrice, Math.round(basePrice * 1.3));

  const preferredFilters = [
    { column: 'status', op: 'eq', value: 'approved' },
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

  return true;
}

export async function fetchSavedListings(tenantId, accessToken) {
  const saved = await selectRows('saved_listings', {
    select: 'tenant_id,listing_id,saved_at',
    filters: [{ column: 'tenant_id', op: 'eq', value: tenantId }],
    order: 'saved_at.desc',
    accessToken
  });

  const listingIds = saved.map((item) => item.listing_id);
  if (listingIds.length === 0) {
    return [];
  }

  const listings = await selectRows('listings', {
    select:
      'id,lister_id,title,description,room_type,gender_preference,price_monthly,security_deposit,utilities_included,floor,total_rooms,furnished,property_type,owner_name,owner_phone,whatsapp_number,min_lease_months,payment_schedule,late_fee_policy,video_tour_url,accessibility_notes,region,district,ward,street,lat,lng,amenities,house_rules,available_from,vacancy_status,status,rejection_reason,featured,near_universities,view_count,created_at',
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

  const rows = await selectRows('reviews', {
    select: 'id,listing_id,tenant_id,rating,comment,created_at',
    filters: [
      { column: 'listing_id', op: 'eq', value: listingId },
      { column: 'is_hidden', op: 'eq', value: false }
    ],
    order: 'created_at.desc',
    limit: 100,
    accessToken
  });

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
      duration_months: Number(durationMonths),
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

  const rows = await selectRows('bookings', {
    select:
      'id,listing_id,tenant_id,lister_id,move_in_date,duration_months,message,contact_preference,status,created_at,updated_at',
    // The previous code had a duplicate filters key. This block corrects it by merging the required columns
    filters: [{ column: 'listing_id', op: 'eq', value: listingId }, { column: 'tenant_id', op: 'eq', value: userId, orGroup: true }, { column: 'lister_id', op: 'eq', value: userId, orGroup: true }],
    or: `tenant_id.eq.${userId},lister_id.eq.${userId}`,
    order: 'created_at.desc',
    limit: 100,
    accessToken
  });

  const profiles = await fetchProfilesByIds(
    rows
      .flatMap((row) => [row.tenant_id, row.lister_id])
      .filter(Boolean),
    accessToken
  );

  return rows.map((row) => ({
    id: row.id,
    listingId: row.listing_id,
    tenantId: row.tenant_id,
    listerId: row.lister_id,
    moveInDate: row.move_in_date,
    durationMonths: Number(row.duration_months || 0),
    message: row.message || '',
    contactPreference: row.contact_preference || 'in_app_chat',
    status: row.status || 'requested',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tenantName: profiles.get(row.tenant_id)?.full_name || 'Tenant',
    listerName: profiles.get(row.lister_id)?.full_name || 'Lister'
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
