import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '../.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetch() {
  console.log("Fetching listings view...");
  const { data, error } = await supabase.from('listings').select('*').limit(5);
  
  if (error) {
    console.error("View error:", error);
  } else {
    console.log(`View found ${data?.length || 0} homes.`);
  }

  console.log("Fetching properties directly...");
  const { data: pData, error: pError } = await supabase.from('properties').select('id, title, status').limit(5);
  
  if (pError) {
    console.error("Props error:", pError);
  } else {
    console.log(`Properties found ${pData?.length || 0} homes.`);
  }

  console.log("Fetching rooms directly...");
  const { data: rData, error: rError } = await supabase.from('rooms').select('id, property_id, availability_status').limit(5);
  
  if (rError) {
    console.error("Rooms error:", rError);
  } else {
    console.log(`Rooms found ${rData?.length || 0} homes.`);
  }
}

testFetch();
