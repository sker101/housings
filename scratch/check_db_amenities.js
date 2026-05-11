const url = process.env.VITE_SUPABASE_URL || 'https://iavflytaqfdwhmshocvm.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhdmZseXRhcWZkd2htc2hvY3ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxOTU1ODEsImV4cCI6MjA4Nzc3MTU4MX0.kvC4YaE9LnbTpJHGgul8AEqXc81pkEpwdK_6PQJUdSU';

async function run() {
  const res = await fetch(`${url}/rest/v1/rooms?select=id,amenities&order=created_at.desc&limit=1`, {
    method: 'GET',
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }
  });
  const data = await res.json();
  console.log("From rooms table:", JSON.stringify(data, null, 2));

  const res2 = await fetch(`${url}/rest/v1/listings?select=id,amenities&order=created_at.desc&limit=1`, {
    method: 'GET',
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }
  });
  const data2 = await res2.json();
  console.log("From listings view:", JSON.stringify(data2, null, 2));
}
run();
