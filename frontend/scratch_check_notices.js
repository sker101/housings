import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function findLandlordsAndNotices() {
  // Query profiles for landlord or lister
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, email, role, full_name')
    .or('role.eq.landlord,role.eq.lister');

  if (pErr) {
    console.error("Error fetching landlord profiles:", pErr);
    return;
  }
  
  console.log("Landlord Profiles found:", JSON.stringify(profiles, null, 2));

  // Let's also fetch ALL notices without a filter
  const { data: notices, error: nErr } = await supabase
    .from('move_out_notices')
    .select('*, profiles:tenant_id(full_name, phone), listings:property_id(title)');

  if (nErr) {
    console.error("Error fetching notices:", nErr);
  } else {
    console.log("All notices:", JSON.stringify(notices, null, 2));
  }
}

findLandlordsAndNotices();
