#!/usr/bin/env node

const SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://iavflytaqfdwhmshocvm.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SERVICE_ROLE_KEY) {
  console.error(
    'Missing SUPABASE_SERVICE_ROLE_KEY. Export it before running this script.'
  );
  process.exit(1);
}

const BASE_HEADERS = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`
};

const seedUsers = [
  {
    email: 'admin@campusstay.co',
    password: 'ChangeMe123!',
    meta: { full_name: 'CampusStay Admin', role: 'admin', phone: '+255700000001' }
  },
  {
    email: 'lister.owner@campusstay.co',
    password: 'ChangeMe123!',
    meta: {
      full_name: 'Asha Owner',
      role: 'lister',
      lister_type: 'owner',
      phone: '+255700000101'
    }
  },
  {
    email: 'lister.manager@campusstay.co',
    password: 'ChangeMe123!',
    meta: {
      full_name: 'Baraka Manager',
      role: 'lister',
      lister_type: 'manager',
      phone: '+255700000102'
    }
  },
  {
    email: 'student.one@campusstay.co',
    password: 'ChangeMe123!',
    meta: {
      full_name: 'Neema Student',
      role: 'student',
      phone: '+255700000201'
    }
  },
  {
    email: 'student.two@campusstay.co',
    password: 'ChangeMe123!',
    meta: {
      full_name: 'Juma Student',
      role: 'student',
      phone: '+255700000202'
    }
  }
];

const fixedIds = {
  listingApproved: '11b5f12d-377f-40dc-8c8a-3fd3203f0550',
  listingPending: 'cc13818d-5001-4acc-b952-35fc2f598780',
  listingFlagged: '45dddfdc-e7e2-4b10-bbcf-e5514d5ce0dc',
  conversationOne: '54860a3d-4a85-42c9-b3ba-acf5427af104',
  conversationTwo: 'decd1a02-f2c4-4101-b2f5-7c3a4958a573',
  msgOne: '03d2305d-2b9d-4187-a413-4a3748d40677',
  msgTwo: '91f58ea8-e727-4f6a-9880-bc68e6a31e04',
  msgThree: '7ba04f4e-3527-4531-8b39-f7f8ef321c3e',
  msgFour: '032fcf07-18f8-4c2d-bc95-a6fc2a78ca30',
  adminLogOne: 'f95876d6-0f8b-42f6-8278-1ef2b7c3f194',
  adminLogTwo: 'afafaf1c-0b6c-4d1f-bb11-f7166f438f72',
  adminLogThree: '7f9af304-e2be-4908-b57c-12675cf27f18'
};

function parsePayload(text) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function request(path, options = {}) {
  const method = options.method || 'GET';
  const headers = {
    ...BASE_HEADERS,
    ...(options.headers || {})
  };
  const body = options.body;

  if (body != null && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers,
    body: body == null ? undefined : JSON.stringify(body)
  });

  const text = await response.text();
  const payload = parsePayload(text);

  if (!response.ok) {
    const message =
      payload?.msg ||
      payload?.message ||
      payload?.error_description ||
      payload?.error ||
      `Request failed (${response.status})`;
    throw new Error(`${message} :: ${path}`);
  }

  return payload;
}

async function listAuthUsers() {
  const result = await request('/auth/v1/admin/users?page=1&per_page=1000');
  return Array.isArray(result?.users) ? result.users : [];
}

async function createOrGetAuthUser({ email, password, meta }) {
  try {
    const payload = await request('/auth/v1/admin/users', {
      method: 'POST',
      body: {
        email,
        password,
        email_confirm: true,
        user_metadata: meta
      }
    });
    return payload.user || payload;
  } catch (error) {
    const message = String(error.message || '').toLowerCase();
    if (!message.includes('already') && !message.includes('exists')) {
      throw error;
    }

    const users = await listAuthUsers();
    const existing = users.find(
      (user) => String(user.email || '').toLowerCase() === email.toLowerCase()
    );

    if (!existing) {
      throw new Error(`User create conflict but not found by email: ${email}`);
    }

    return existing;
  }
}

async function upsertRows(table, onConflict, rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  const merged = [];
  for (const row of rows) {
    // eslint-disable-next-line no-await-in-loop
    const payload = await request(
      `/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`,
      {
        method: 'POST',
        headers: {
          Prefer: 'resolution=merge-duplicates,return=representation'
        },
        body: [row]
      }
    );
    if (Array.isArray(payload)) {
      merged.push(...payload);
    }
  }

  return merged;
}

async function run() {
  const authUsers = [];
  for (const user of seedUsers) {
    // eslint-disable-next-line no-await-in-loop
    const created = await createOrGetAuthUser(user);
    authUsers.push(created);
  }

  const userIdByEmail = Object.fromEntries(
    authUsers.map((user) => [String(user.email || '').toLowerCase(), user.id])
  );

  const adminId = userIdByEmail['admin@campusstay.co'];
  const ownerId = userIdByEmail['lister.owner@campusstay.co'];
  const managerId = userIdByEmail['lister.manager@campusstay.co'];
  const studentOneId = userIdByEmail['student.one@campusstay.co'];
  const studentTwoId = userIdByEmail['student.two@campusstay.co'];

  const profiles = [
    {
      id: adminId,
      role: 'admin',
      full_name: 'CampusStay Admin',
      phone: '+255700000001',
      phone_verified: true,
      verification_status: 'verified',
      subscription_plan: 'premium'
    },
    {
      id: ownerId,
      role: 'lister',
      lister_type: 'owner',
      full_name: 'Asha Owner',
      phone: '+255700000101',
      phone_verified: true,
      verification_status: 'verified',
      subscription_plan: 'verified',
      payout_provider: 'mpesa',
      payout_reference: '255700000101'
    },
    {
      id: managerId,
      role: 'lister',
      lister_type: 'manager',
      full_name: 'Baraka Manager',
      phone: '+255700000102',
      phone_verified: true,
      verification_status: 'pending',
      subscription_plan: 'free'
    },
    {
      id: studentOneId,
      role: 'student',
      full_name: 'Neema Student',
      phone: '+255700000201',
      phone_verified: true,
      verification_status: 'verified',
      university: 'UDSM'
    },
    {
      id: studentTwoId,
      role: 'student',
      full_name: 'Juma Student',
      phone: '+255700000202',
      phone_verified: true,
      verification_status: 'verified',
      university: 'IFM'
    }
  ];

  await upsertRows('profiles', 'id', profiles);

  const listings = [
    {
      id: fixedIds.listingApproved,
      lister_id: ownerId,
      title: 'Verified single room near UDSM gate',
      description:
        'Private single room with reliable water, quiet compound, and easy daladala access to UDSM main campus.',
      room_type: 'single',
      gender_preference: 'any',
      price_monthly: 250000,
      utilities_included: true,
      region: 'Dar es Salaam',
      district: 'Ubungo',
      ward: 'Sinza',
      street: 'Mlimani Street',
      lat: -6.784,
      lng: 39.205,
      amenities: {
        wifi: true,
        water: true,
        electricity: true,
        security: true,
        parking: false,
        generator: false
      },
      house_rules: 'No loud music after 10PM. Visitors during daytime only.',
      available_from: '2026-03-10',
      vacancy_status: 'available',
      status: 'approved',
      featured: true,
      promotion_level: 1,
      near_universities: ['UDSM', 'ARDHI'],
      view_count: 42
    },
    {
      id: fixedIds.listingPending,
      lister_id: managerId,
      title: 'Shared apartment room in Kinondoni',
      description:
        'Shared apartment option with furnished common area and strong neighborhood security.',
      room_type: 'shared',
      gender_preference: 'female',
      price_monthly: 180000,
      utilities_included: false,
      region: 'Dar es Salaam',
      district: 'Kinondoni',
      ward: 'Makumbusho',
      street: 'Kijitonyama Road',
      lat: -6.7662,
      lng: 39.2414,
      amenities: {
        wifi: true,
        water: true,
        electricity: true,
        security: true,
        parking: true,
        generator: false
      },
      house_rules: 'Female tenants only. One month deposit required.',
      available_from: '2026-03-15',
      vacancy_status: 'coming_soon',
      status: 'pending',
      featured: false,
      promotion_level: 0,
      near_universities: ['IFM'],
      view_count: 8
    },
    {
      id: fixedIds.listingFlagged,
      lister_id: ownerId,
      title: 'Bedsit near Mwenge bus stand',
      description:
        'Bedsit unit close to transport routes. Needs profile moderation follow-up before approval.',
      room_type: 'bedsit',
      gender_preference: 'any',
      price_monthly: 220000,
      utilities_included: true,
      region: 'Dar es Salaam',
      district: 'Kinondoni',
      ward: 'Mwenge',
      street: 'Sam Nujoma Road',
      lat: -6.7727,
      lng: 39.2326,
      amenities: {
        wifi: false,
        water: true,
        electricity: true,
        security: false,
        parking: false,
        generator: false
      },
      house_rules: 'No smoking indoors.',
      available_from: '2026-04-01',
      vacancy_status: 'available',
      status: 'flagged',
      rejection_reason: 'Policy review pending',
      featured: false,
      promotion_level: 0,
      near_universities: ['UDSM'],
      view_count: 15
    }
  ];

  await upsertRows('listings', 'id', listings);

  const listingPhotos = [
    {
      listing_id: fixedIds.listingApproved,
      angle: 'bedroom',
      storage_path: `seed/${fixedIds.listingApproved}/bedroom.jpg`,
      public_url:
        'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
      ai_verified: true,
      ai_confidence: 0.93
    },
    {
      listing_id: fixedIds.listingApproved,
      angle: 'kitchen',
      storage_path: `seed/${fixedIds.listingApproved}/kitchen.jpg`,
      public_url:
        'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1200&q=80',
      ai_verified: true,
      ai_confidence: 0.9
    },
    {
      listing_id: fixedIds.listingApproved,
      angle: 'bathroom',
      storage_path: `seed/${fixedIds.listingApproved}/bathroom.jpg`,
      public_url:
        'https://images.unsplash.com/photo-1584622781564-1d987f7333c1?auto=format&fit=crop&w=1200&q=80',
      ai_verified: true,
      ai_confidence: 0.88
    },
    {
      listing_id: fixedIds.listingApproved,
      angle: 'outside',
      storage_path: `seed/${fixedIds.listingApproved}/outside.jpg`,
      public_url:
        'https://images.unsplash.com/photo-1523217582562-09d0def993a6?auto=format&fit=crop&w=1200&q=80',
      ai_verified: true,
      ai_confidence: 0.91
    }
  ];

  await upsertRows('listing_photos', 'listing_id,angle', listingPhotos);

  const conversations = [
    {
      id: fixedIds.conversationOne,
      listing_id: fixedIds.listingApproved,
      tenant_id: studentOneId,
      lister_id: ownerId,
      inquiry_status: 'interested',
      move_in_date: '2026-03-20',
      last_message_at: new Date().toISOString()
    },
    {
      id: fixedIds.conversationTwo,
      listing_id: fixedIds.listingPending,
      tenant_id: studentTwoId,
      lister_id: managerId,
      inquiry_status: 'open',
      move_in_date: '2026-03-30',
      last_message_at: new Date(Date.now() - 1000 * 60 * 60).toISOString()
    }
  ];

  await upsertRows('conversations', 'listing_id,tenant_id', conversations);

  const messages = [
    {
      id: fixedIds.msgOne,
      conversation_id: fixedIds.conversationOne,
      sender_id: studentOneId,
      body: 'Hi, is this room still available for March move-in?'
    },
    {
      id: fixedIds.msgTwo,
      conversation_id: fixedIds.conversationOne,
      sender_id: ownerId,
      body: 'Yes, it is available. You can schedule a visit this weekend.'
    },
    {
      id: fixedIds.msgThree,
      conversation_id: fixedIds.conversationTwo,
      sender_id: studentTwoId,
      body: 'Can you share updated photos of the common areas?'
    },
    {
      id: fixedIds.msgFour,
      conversation_id: fixedIds.conversationTwo,
      sender_id: managerId,
      body: 'Sure, I will upload them this evening.'
    }
  ];

  await upsertRows('messages', 'id', messages);

  await upsertRows('saved_listings', 'tenant_id,listing_id', [
    {
      tenant_id: studentOneId,
      listing_id: fixedIds.listingApproved
    },
    {
      tenant_id: studentTwoId,
      listing_id: fixedIds.listingApproved
    }
  ]);

  await upsertRows('listing_drafts', 'lister_id', [
    {
      lister_id: managerId,
      current_step: 3,
      data: {
        title: 'Draft listing near IFM',
        region: 'Dar es Salaam',
        district: 'Ilala',
        ward: 'Kivukoni',
        street: 'Sokoine Drive',
        priceMonthly: 210000
      }
    }
  ]);

  await upsertRows('admin_audit_log', 'id', [
    {
      id: fixedIds.adminLogOne,
      admin_id: adminId,
      action: 'approve_landlord',
      target_type: 'landlord',
      target_id: ownerId,
      reason: 'Identity and selfie validated'
    },
    {
      id: fixedIds.adminLogTwo,
      admin_id: adminId,
      action: 'approve_listing',
      target_type: 'listing',
      target_id: fixedIds.listingApproved,
      reason: 'Listing quality and photos verified'
    },
    {
      id: fixedIds.adminLogThree,
      admin_id: adminId,
      action: 'flag',
      target_type: 'listing',
      target_id: fixedIds.listingFlagged,
      reason: 'Requires clarification on listing details'
    }
  ]);

  console.log('Seed completed successfully.');
  console.log('\nTest accounts (password for all: ChangeMe123!):');
  console.log('- admin@campusstay.co');
  console.log('- lister.owner@campusstay.co');
  console.log('- lister.manager@campusstay.co');
  console.log('- student.one@campusstay.co');
  console.log('- student.two@campusstay.co');
}

run().catch((error) => {
  console.error('Seed failed:', error.message);
  process.exit(1);
});
