const url = process.env.VITE_SUPABASE_URL || 'https://iavflytaqfdwhmshocvm.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhdmZseXRhcWZkd2htc2hvY3ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxOTU1ODEsImV4cCI6MjA4Nzc3MTU4MX0.kvC4YaE9LnbTpJHGgul8AEqXc81pkEpwdK_6PQJUdSU';

async function run() {
  const res = await fetch(`${url}/rest/v1/rpc/get_listing_with_contact`, {
    method: 'POST',
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_listing_id: "4977b7af-e932-41bb-948d-3b2f3773da58" })
  });
  const data = await res.text();
  console.log("RPC result:", data);
}
run();
