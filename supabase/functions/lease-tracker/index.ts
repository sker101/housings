import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const AT_KEY = Deno.env.get('AT_API_KEY')!
const AT_USER = Deno.env.get('AT_USERNAME')!

async function sendSMS(to: string, message: string) {
  await fetch('https://api.africastalking.com/version1/messaging', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'apiKey': AT_KEY,
    },
    body: new URLSearchParams({ username: AT_USER, to, message })
  })
}

Deno.serve(async () => {
  // ── 1. Find leases hitting 30 days → flip to available_soon + SMS ──
  const { data: soonLeases } = await supabase
    .from('tenant_leases')
    .select(`
      id, room_id, lease_end_date, days_remaining, renewal_sms_sent,
      tenant:tenants(profile:profiles(phone, full_name))
    `)
    .eq('status', 'active')
    .lte('days_remaining', 30)
    .gt('days_remaining', 0)
    .eq('renewal_sms_sent', false)

  for (const lease of soonLeases ?? []) {
    await supabase.from('rooms')
      .update({ availability_status: 'listed_occupied' })
      .eq('id', lease.room_id)

    await supabase.from('tenant_leases')
      .update({ renewal_sms_sent: true })
      .eq('id', lease.id)

    const phone = lease.tenant?.profile?.phone
    const name = lease.tenant?.profile?.full_name ?? 'Mpangaji'
    const endDate = new Date(lease.lease_end_date).toLocaleDateString('sw-TZ')
    if (phone) {
      await sendSMS(phone,
        `Habari ${name}! Mkataba wako wa chumba unaisha tarehe ${endDate} (siku ${lease.days_remaining} zimebaki). Je, unataka kuendelea au unahamia? Jibu kupitia CampusStay TZ. - CampusStay`
      )
    }
  }

  // ── 2. Flip available_soon for confirmed leavers ──
  const { data: leavingLeases } = await supabase
    .from('tenant_leases')
    .select('room_id')
    .eq('status', 'active')
    .eq('renewal_decision', 'leaving')
    .lte('days_remaining', 30)

  for (const lease of leavingLeases ?? []) {
    const { data: room } = await supabase
      .from('rooms')
      .select('availability_status')
      .eq('id', lease.room_id)
      .single()

    if (room?.availability_status === 'listed_occupied') {
      await supabase.from('rooms')
        .update({ availability_status: 'available_soon' })
        .eq('id', lease.room_id)
    }
  }

  // ── 3. Handle leases that ended today ──
  const { data: endedLeases } = await supabase
    .from('tenant_leases')
    .select('id, room_id')
    .eq('status', 'active')
    .eq('days_remaining', 0)

  for (const lease of endedLeases ?? []) {
    await supabase.from('tenant_leases')
      .update({ status: 'ended' })
      .eq('id', lease.id)

    // Check if there is a pending pre-booking
    const { data: prebook } = await supabase
      .from('pre_bookings')
      .select('id, tenant_id, deposit_tzs')
      .eq('room_id', lease.room_id)
      .eq('status', 'pending')
      .single()

    if (prebook) {
      // Set 48-hour payment window
      const deadline = new Date()
      deadline.setHours(deadline.getHours() + 48)
      await supabase.from('pre_bookings')
        .update({ payment_deadline: deadline.toISOString() })
        .eq('id', prebook.id)

      // SMS pre-booker
      const { data: tenantProfile } = await supabase
        .from('tenants')
        .select('profile:profiles(phone, full_name)')
        .eq('id', prebook.tenant_id)
        .single()
      const phone = tenantProfile?.profile?.phone
      const name = tenantProfile?.profile?.full_name ?? 'Mpangaji'
      if (phone) {
        await sendSMS(phone,
          `Habari ${name}! Chumba ulichoweka nafasi kimekuwa wazi. Una masaa 48 kulipa kodi ya kwanza. Ingia CampusStay TZ sasa. - CampusStay`
        )
      }
    } else {
      // No pre-booking — open immediately
      await supabase.from('rooms')
        .update({ availability_status: 'available', is_available: true })
        .eq('id', lease.room_id)
    }
  }

  // ── 4. No-show check — pre-bookings past payment deadline ──
  const { data: noShows } = await supabase
    .from('pre_bookings')
    .select('id, room_id')
    .eq('status', 'pending')
    .lt('payment_deadline', new Date().toISOString())

  for (const pb of noShows ?? []) {
    await supabase.from('pre_bookings')
      .update({ status: 'no_show' })
      .eq('id', pb.id)

    await supabase.from('rooms')
      .update({ availability_status: 'available', is_available: true })
      .eq('id', pb.room_id)
  }

  return new Response(JSON.stringify({ ok: true, ts: new Date().toISOString() }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
