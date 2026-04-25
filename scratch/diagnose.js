
const supabaseUrl = 'https://iavflytaqfdwhmshocvm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhdmZseXRhcWZkd2htc2hvY3ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxOTU1ODEsImV4cCI6MjA4Nzc3MTU4MX0.kvC4YaE9LnbTpJHGgul8AEqXc81pkEpwdK_6PQJUdSU';

async function diagnose() {
  console.log('--- Diagnosing Database Schema ---');
  const schemaRes = await fetch(`${supabaseUrl}/rest/v1/listing_photos?select=*&limit=1`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  
  if (schemaRes.ok) {
    const data = await schemaRes.json();
    console.log('Sample Photo Row:', JSON.stringify(data[0], null, 2));
    if (data[0]) {
      const keys = Object.keys(data[0]);
      console.log('Columns in listing_photos:', keys.join(', '));
      const expected = ['position', 'caption', 'is_cover'];
      const missing = expected.filter(k => !keys.includes(k));
      if (missing.length > 0) {
        console.error('❌ MISSING COLUMNS:', missing.join(', '));
      } else {
        console.log('✅ ALL COLUMNS PRESENT');
      }
    } else {
      console.log('Table listing_photos is empty');
    }
  } else {
    console.error('❌ Failed to fetch listing_photos:', schemaRes.status, await schemaRes.text());
  }

  console.log('\n--- Diagnosing Storage ---');
  const storageRes = await fetch(`${supabaseUrl}/storage/v1/object/list/listing-photos`, {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prefix: '',
      limit: 10,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' }
    })
  });

  if (storageRes.ok) {
    const files = await storageRes.json();
    console.log('Sample Storage Objects:', JSON.stringify(files, null, 2));
  } else {
    console.error('❌ Failed to list storage:', storageRes.status, await storageRes.text());
  }
}

diagnose();
