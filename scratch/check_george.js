
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkGeorgePhotos() {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name')
    .ilike('full_name', '%George Rashid%')
    .single();

  if (!profile) {
    console.log('George Rashid not found');
    return;
  }

  console.log(`Found Profile: ${profile.full_name} (${profile.id})`);

  const { data: listings } = await supabase
    .from('listings')
    .select('id, title')
    .eq('lister_id', profile.id);

  console.log(`Found ${listings?.length || 0} listings`);

  for (const listing of (listings || [])) {
    const { data: photos } = await supabase
      .from('listing_photos')
      .select('*')
      .eq('listing_id', listing.id);
    
    console.log(`Listing: ${listing.title} (${listing.id}) has ${photos?.length || 0} photos`);
    if (photos && photos.length > 0) {
      console.log('Photos:', JSON.stringify(photos, null, 2));
    }
  }
}

checkGeorgePhotos();
