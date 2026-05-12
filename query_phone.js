import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
);

async function run() {
  const { data, error } = await supabase.from('profiles').select('id, full_name, phone').eq('full_name', 'Norbert');
  console.log("Norbert profile:", data, error);
}
run();
