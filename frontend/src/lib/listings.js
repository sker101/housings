import {
  deleteRows,
  insertRows,
  selectRows,
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
    utilitiesIncluded: Boolean(row.utilities_included),
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
    select: 'id,listing_id,angle,public_url,ai_verified,ai_confidence',
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

export async function fetchApprovedListings(filters = {}, accessToken) {
  const queryFilters = [{ column: 'status', op: 'eq', value: 'approved' }];

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
      value: Number(filters.minPrice)
    });
  }

  if (filters.maxPrice != null && filters.maxPrice !== '') {
    queryFilters.push({
      column: 'price_monthly',
      op: 'lte',
      value: Number(filters.maxPrice)
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
      'id,lister_id,title,description,room_type,gender_preference,price_monthly,utilities_included,region,district,ward,street,lat,lng,amenities,house_rules,available_from,vacancy_status,status,rejection_reason,featured,near_universities,view_count,created_at',
    filters: queryFilters,
    or: filters.query
      ? `title.ilike.*${filters.query}*,district.ilike.*${filters.query}*,ward.ilike.*${filters.query}*`
      : undefined,
    order,
    limit: filters.limit || 60,
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
      'id,lister_id,title,description,room_type,gender_preference,price_monthly,utilities_included,region,district,ward,street,lat,lng,amenities,house_rules,available_from,vacancy_status,status,rejection_reason,featured,near_universities,view_count,created_at',
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
      'id,lister_id,title,description,room_type,gender_preference,price_monthly,utilities_included,region,district,ward,street,lat,lng,amenities,house_rules,available_from,vacancy_status,status,rejection_reason,featured,near_universities,view_count,created_at',
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
  const payload = { status };

  if (reason != null) {
    payload.rejection_reason = reason;
  }

  const rows = await updateRows('listings', payload, {
    filters: [{ column: 'id', op: 'eq', value: listingId }],
    accessToken
  });

  return rows[0] || null;
}
