import { selectRows } from '../lib/supabase';

async function check() {
  try {
    const rows = await selectRows('listing_photos', { limit: 1 });
    console.log('Listing Photos Sample Row:', rows[0]);
  } catch (err) {
    console.error('Error checking schema:', err);
  }
}

check();
