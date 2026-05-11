const url = process.env.VITE_SUPABASE_URL || 'https://iavflytaqfdwhmshocvm.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhdmZseXRhcWZkd2htc2hvY3ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxOTU1ODEsImV4cCI6MjA4Nzc3MTU4MX0.kvC4YaE9LnbTpJHGgul8AEqXc81pkEpwdK_6PQJUdSU';

async function run() {
  const res = await fetch(`${url}/rest/v1/listings?select=id,title,amenities&order=created_at.desc&limit=1`, {
    method: 'GET',
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
run();
