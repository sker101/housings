
const supabaseUrl = 'https://iavflytaqfdwhmshocvm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhdmZseXRhcWZkd2htc2hvY3ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxOTU1ODEsImV4cCI6MjA4Nzc3MTU4MX0.kvC4YaE9LnbTpJHGgul8AEqXc81pkEpwdK_6PQJUdSU';

async function listBuckets() {
  const res = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  const buckets = await res.json();
  console.log('Buckets:', JSON.stringify(buckets, null, 2));
}

listBuckets();
