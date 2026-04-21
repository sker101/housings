import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const AT_KEY  = Deno.env.get('AT_API_KEY')!
const AT_USER = Deno.env.get('AT_USERNAME')!

// ── iRent branding ──────────────────────────────────────────────
const SMS_TAG = '- iRent'

async function sendSMS(to: string, message: string) {
  await fetch('https://api.africastalking.com/version1/messaging', {
    method: 'POST',
    headers: {
      'Accept':       'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'apiKey':        AT_KEY,
    },
    body: new URLSearchParams({ username: AT_USER, to, message })
  })
}

Deno.serve(async () => {
  // ── 1. Leases within 30 days → listed_occupied + SMS ───────────────
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
    // Flip room to listed_occupied so it shows in public search with "Coming Soon"
    await supabase.from('rooms')
      .update({ availability_status: 'listed_occupied' })
      .eq('id', lease.room_id)

    await supabase.from('tenant_leases')
      .update({ renewal_sms_sent: true })
      .eq('id', lease.id)

    const phone = lease.tenant?.profile?.phone
    const name  = lease.tenant?.profile?.full_name ?? 'Mpangaji'
    const days  = lease.days_remaining

    if (phone) {
      // Swahili SMS signed with iRent brand
      await sendSMS(phone,
        `Habari ${name}! Mkataba wako iRent unaisha baada ya siku ${days}. Je, utahama au utabaki? Jibu kupitia programu yako ya iRent. ${SMS_TAG}`
      )
    }
  }

  // ── 2. Confirmed leavers → flip to available_soon ──────────────────
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

  // ── 3. Leases ended today ──────────────────────────────────────────
  const { data: endedLeases } = await supabase
    .from('tenant_leases')
    .select('id, room_id')
    .eq('status', 'active')
    .eq('days_remaining', 0)

  for (const lease of endedLeases ?? []) {
    await supabase.from('tenant_leases')
      .update({ status: 'ended' })
      .eq('id', lease.id)

    // Check for confirmed pre-booking
    const { data: prebook } = await supabase
      .from('pre_bookings')
      .select('id, tenant_id, deposit_tzs')
      .eq('room_id', lease.room_id)
      .eq('status', 'pending')
      .single()

    if (prebook) {
      // Grant 48-hour payment window before releasing the room
      const deadline = new Date()
      deadline.setHours(deadline.getHours() + 48)
      await supabase.from('pre_bookings')
        .update({ payment_deadline: deadline.toISOString() })
        .eq('id', prebook.id)

      // SMS the pre-booker in Swahili
      const { data: tenantProfile } = await supabase
        .from('tenants')
        .select('profile:profiles(phone, full_name)')
        .eq('id', prebook.tenant_id)
        .single()
      const phone = tenantProfile?.profile?.phone
      const name  = tenantProfile?.profile?.full_name ?? 'Mpangaji'
      if (phone) {
        await sendSMS(phone,
          `Habari ${name}! Chumba ulichoweka nafasi kimekuwa wazi. Una masaa 48 kulipa kodi ya kwanza. Ingia iRent sasa kulipa na kuhakikisha nafasi yako. ${SMS_TAG}`
        )
      }
    } else {
      // No pre-booking — release immediately
      await supabase.from('rooms')
        .update({ availability_status: 'available', is_available: true })
        .eq('id', lease.room_id)
    }
  }

  // ── 4. No-show enforcement — pre-bookings past payment deadline ────
  const { data: noShows } = await supabase
    .from('pre_bookings')
    .select('id, room_id')
    .eq('status', 'pending')
    .not('payment_deadline', 'is', null)
    .lt('payment_deadline', new Date().toISOString())

  for (const pb of noShows ?? []) {
    await supabase.from('pre_bookings')
      .update({ status: 'no_show' })
      .eq('id', pb.id)

    // Release the room back to available
    await supabase.from('rooms')
      .update({ availability_status: 'available', is_available: true })
      .eq('id', pb.room_id)
  }

  // ── 5. Pay room referral rewards for confirmed pre-bookings ────────
  const { data: pendingReferrals } = await supabase
    .from('room_referrals')
    .select('id')
    .eq('status', 'confirmed')
    .eq('reward_paid', false)

  for (const ref of pendingReferrals ?? []) {
    await supabase.rpc('pay_room_referral_reward', { p_room_referral_id: ref.id })
  }

  return new Response(
    JSON.stringify({ ok: true, ts: new Date().toISOString(), brand: 'iRent' }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
