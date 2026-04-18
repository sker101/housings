import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function seed() {
  console.log("Signing up a landlord...");
  const email = 'qa_master_' + Date.now() + '@example.com';
  
  const { data: user, error: signErr } = await supabase.auth.signUp({
    email,
    password: 'password123',
    options: { data: { role: 'lister', full_name: 'QA Master Landlord', phone: '255711223344' } }
  });

  if (signErr) return console.log("Signup error:", signErr);
  
  await supabase.auth.signInWithPassword({ email, password: 'password123' });

  console.log("Inserting a dummy listing...");
  const { data: listing, error: lErr } = await supabase.from('listings').insert({
    lister_id: user.user.id,
    title: 'QA Admin Property ' + Date.now(),
    description: 'An exclusive unit for QA.',
    price_monthly: 200000,
    region: 'Dar es Salaam',
    district: 'Ilala',
    status: 'approved',
    room_type: 'single',
    gender_preference: 'any',
    vacancy_status: 'available',
    utilities_included: true
  }).select().single();

  if (lErr) return console.log("Listing error:", lErr);
  console.log("SUCCESS. Created listing title:", listing.title);
}
seed();
