
const supabaseUrl = 'https://iavflytaqfdwhmshocvm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhdmZseXRhcWZkd2htc2hvY3ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxOTU1ODEsImV4cCI6MjA4Nzc3MTU4MX0.kvC4YaE9LnbTpJHGgul8AEqXc81pkEpwdK_6PQJUdSU';

async function checkReportsSchema() {
  const res = await fetch(`${supabaseUrl}/rest/v1/listing_reports?select=*&limit=1`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  if (res.ok) {
    const data = await res.json();
    console.log('Sample Report Row:', JSON.stringify(data[0], null, 2));
    if (data[0]) {
      console.log('Columns:', Object.keys(data[0]).join(', '));
    } else {
      console.log('Table listing_reports is empty');
    }
  } else {
    console.error('❌ Failed to fetch listing_reports:', res.status, await res.text());
  }
}

checkReportsSchema();
