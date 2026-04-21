import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '../.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testFetch() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@campusstay.co',
    password: 'ChangeMe123!'
  });

  console.log("Auth:", authError ? authError.message : "Success");
  
  const token = authData?.session?.access_token;
  if (!token) return;

  const { data, error } = await supabase.from('listings').select('*').limit(5);
  
  if (error) {
    console.error("View error:", error);
  } else {
    console.log(`View found ${data?.length || 0} homes.`);
  }
}

testFetch();
