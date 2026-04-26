/**
 * LandlordDashboard.tsx — iRent
 * KPIs: Total Revenue (TZS), Occupancy Rate, Pending Documents
 * Lease Tracker: colour-coded table (<30 days = Amber, <7 days = Red)
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Building2, AlertTriangle } from 'lucide-react';
import { SkeletonCard } from '../../components/SkeletonCard';
import { InquiryCard } from '../../components/InquiryCard';
import { useAuth } from '../../context/AuthContext';
import { useListings } from '../../hooks/useListings';
import { useInquiries } from '../../hooks/useInquiries';

import { useActivityLog } from '../../hooks/useActivityLog';
import { TZSFormat, formatDate } from '../../utils/format';
import { selectRows } from '../../lib/supabase';
import toast from 'react-hot-toast';

function KpiCard({ label, value, sub, accent }: {
  label: string; value: string; sub?: string; accent?: string;
}) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '1rem',
    }}>
      <p style={{ fontSize: '0.73rem', fontWeight: 600, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </p>
      <p style={{ fontFamily: " sans-serif", fontSize: '1.65rem', fontWeight: 800, color: accent ?? 'var(--ink)', lineHeight: 1.15, margin: '0.25rem 0 0' }}>
        {value}
      </p>
      {sub && <p style={{ fontSize: '0.76rem', color: 'var(--mid)', marginTop: '0.15rem' }}>{sub}</p>}
    </div>
  );
}

interface LeaseRow {
  id: string;
  room_id: string;
  days_remaining: number;
  lease_end_date: string;
  status: string;
  renewal_decision: string | null;
  tenant?: { profile?: { full_name?: string } };
  room?: { room_number?: string; property?: { title?: string } };
}

export default function LandlordDashboard() {
  const { user, token } = useAuth();
  const userId = user?.userId ?? null;

  const [listings, setListings]           = useState<any[]>([]);
  const [listLoading, setListLoading]     = useState(true);
  const { inquiries, loading: inqLoading, acceptInquiry, declineInquiry } = useInquiries('host', userId, token);
  const { events, loading: actLoading } = useActivityLog(userId, token);

  const [leases, setLeases]               = useState<LeaseRow[]>([]);
  const [pendingDocs, setPendingDocs]     = useState(0);
  const [totalRevenue, setTotalRevenue]   = useState(0);
  const [roomEarnings, setRoomEarnings]   = useState<Record<string, { title: string, amount: number }>>({});
  const [recentPayments, setRecentPayments] = useState<any[]>([]);

  // ── Fetch landlord record + leases + pending docs ──────────────
  useEffect(() => {
    if (!userId || !token) return;
    let mounted = true;
    async function load() {
      try {
        setListLoading(true);
        // 1. Fetch George's listings directly
        const listingRows = await selectRows('listings', {
          select: '*',
          filters: [{ column: 'lister_id', op: 'eq', value: userId! }],
          accessToken: token!,
        });
        const mappedListings = (listingRows as any[]).map(r => ({ ...r, status: r.status || 'approved' }));
        if (mounted) setListings(mappedListings);

        // 2. Fetch landlord record for leases
        let lId = null;
        try {
          const landlords = await selectRows('landlords', {
            select: 'id',
            filters: [{ column: 'profile_id', op: 'eq', value: userId! }],
            accessToken: token!,
          });
          if (landlords.length > 0) {
            lId = (landlords[0] as {id:string}).id;
          }
        } catch (e) {
          console.warn('[LandlordDashboard] No "landlords" record found:', e);
        }

        if (mounted && lId) {
          try {
            const leaseRows = await selectRows('tenant_leases', {
              select: 'id, room_id, days_remaining, lease_end_date, status, renewal_decision, tenant:tenants(profile:profiles(full_name)), room:rooms!room_id(room_number, property:properties(title))',
              filters: [
                { column: 'landlord_id', op: 'eq', value: lId },
                { column: 'status',      op: 'eq', value: 'active' },
              ],
              order: 'days_remaining.asc',
              limit: 50,
              accessToken: token!,
            });
            if (mounted) setLeases(leaseRows as LeaseRow[]);
          } catch (e) {
            console.warn('[LandlordDashboard] Lease fetch failed:', e);
          }
        }

        // 3. Total revenue from BOOKINGS
        try {
          const listingIds = mappedListings.map(l => l.id);
          if (listingIds.length > 0) {
            const bookingRows = await selectRows('bookings', {
              select: 'listing_id, total_tzs, status, created_at',
              filters: [{ column: 'listing_id', op: 'in', value: `(${listingIds.join(',')})` }],
              limit: 5000,
              accessToken: token!,
            });
            
            const earningsMap: Record<string, { title: string, amount: number }> = {};
            let total = 0;
            const successfulBookings: any[] = [];
            
            (bookingRows as any[]).forEach(b => {
              if (b.status === 'paid' || b.status === 'completed') {
                const amount = Number(b.total_tzs) || 0;
                total += amount;
                successfulBookings.push(b);
                const listing = mappedListings.find(l => l.id === b.listing_id);
                const roomKey = listing?.title || 'Property';
                if (!earningsMap[roomKey]) earningsMap[roomKey] = { title: roomKey, amount: 0 };
                earningsMap[roomKey].amount += amount;
              }
            });
            
            if (mounted) {
              setTotalRevenue(total);
              setRoomEarnings(earningsMap);
              setRecentPayments(successfulBookings.slice(0, 5).map(b => {
                const listing = mappedListings.find(l => l.id === b.listing_id);
                return {
                  ...b,
                  amount_tzs: b.total_tzs,
                  paid_at: b.created_at,
                  payment_type: 'rent',
                  room_number: listing?.room_number || 'Room'
                };
              }));
            }
          }
        } catch (e) {
          console.warn('[LandlordDashboard] Revenue fetch failed:', e);
        }

        // 4. Pending documents
        try {
          const docs = await selectRows('property_documents', {
            select: 'id',
            filters: [{ column: 'verification_status', op: 'eq', value: 'pending' }],
            accessToken: token!,
          });
          if (mounted) setPendingDocs(docs.length);
        } catch (e) {
          console.warn('[LandlordDashboard] property_documents fetch failed:', e);
        }

      } catch (err) {
        console.error('[LandlordDashboard] Error loading data:', err);
      } finally {
        if (mounted) setListLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [userId, token]);

  const activeListings   = listings.filter(l => l.status === 'approved').length;
  const occupancyRate    = listings.length > 0 ? Math.round((activeListings / listings.length) * 100) : 0;
  const pendingInquiries = inquiries.filter(i => i.status === 'open');

  // Lease colour logic
  function leaseRowBg(days: number) {
    if (days <= 7)  return 'rgba(239,68,68,0.07)';
    if (days <= 30) return 'rgba(245,158,11,0.07)';
    return 'transparent';
  }
  function leaseTextColour(days: number) {
    if (days <= 7)  return '#dc2626';
    if (days <= 30) return '#d97706';
    return 'var(--ink)';
  }
  function leaseBadge(days: number) {
    if (days <= 7)  return <span style={{ background:'#fee2e2', color:'#dc2626', borderRadius:6, padding:'2px 8px', fontSize:'0.7rem', fontWeight:700 }}>CRITICAL</span>;
    if (days <= 30) return <span style={{ background:'#fef3c7', color:'#d97706', borderRadius:6, padding:'2px 8px', fontSize:'0.7rem', fontWeight:700 }}>SOON</span>;
    return null;
  }

  const handleAccept  = async (id: string) => { try { await acceptInquiry(id);  toast.success('Accepted'); } catch { toast.error('Could not accept'); } };
  const handleDecline = async (id: string) => { try { await declineInquiry(id); toast.success('Declined'); } catch { toast.error('Could not decline'); } };

  return (
    <>
      {/* ── Header ────────────────────────────────────────── */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontFamily: " sans-serif", fontSize: '1.3rem', color: 'var(--ink)' }}>
          {user?.fullName?.split(' ')[0] ?? 'Hi'}'s iRent Dashboard
        </h2>
        <p style={{ color: 'var(--mid)', fontSize: '0.88rem' }}>Manage your properties, leases, and income.</p>
      </div>

      {/* ── KPI Grid ──────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <KpiCard label="Total Revenue"    value={TZSFormat(totalRevenue)}     sub="verified income"     accent="var(--jade)" />
        <KpiCard label="Occupancy Rate"   value={`${occupancyRate}%`}         sub={`${activeListings} active units`} />
        <KpiCard label="Pending Docs"     value={String(pendingDocs)}         sub="verification status" accent={pendingDocs > 0 ? '#d97706' : undefined} />
        <KpiCard label="Open Inquiries"   value={String(pendingInquiries.length)} sub="active leads" />
      </div>
      {/* ── Room Earnings ─────────────────────────────────── */}
      <section style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontFamily: " sans-serif", fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--ink)' }}>
          Revenue Breakdown
        </h3>
        {Object.keys(roomEarnings).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14 }}>
            <p style={{ color: 'var(--mid)', fontSize: '0.85rem' }}>No income generated yet.</p>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem'
          }}>
            {Object.values(roomEarnings).map((room, idx) => (
              <div key={idx} style={{ 
                background: 'white', padding: '1rem', borderRadius: '14px', border: '1px solid var(--border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {room.title}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--mid)' }}>Occupied & Paid</p>
                </div>
                <p style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--jade)' }}>
                  {TZSFormat(room.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Recent Income ─────────────────────────────────── */}
      <section style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ fontFamily: " sans-serif", fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={16} style={{ color: 'var(--jade)' }} />
            Recent Income
          </h3>
        </div>
        {recentPayments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14 }}>
            <p style={{ color: 'var(--mid)', fontSize: '0.85rem' }}>No recent payments received.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {recentPayments.map((p, idx) => (
              <div key={idx} style={{ 
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '0.75rem 1rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '36px', height: '36px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--jade)' }}>
                    <Zap size={18} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: 'var(--ink)' }}>
                      {p.booking?.room?.room_number || 'Room'} Payment
                    </p>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--mid)' }}>
                      {p.payment_type === 'first_month' ? 'First Month' : 'Rent Payment'} • {formatDate(p.paid_at || p.created_at)}
                    </p>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--jade)' }}>
                  +{TZSFormat(p.amount_tzs)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <div style={{ display: 'grid', gap: '1.25rem' }}>

        {/* ── Lease Tracker ─────────────────────────────────── */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontFamily: " sans-serif", fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={16} style={{ color: '#d97706' }} />
              Lease Tracker
            </h3>
          </div>
          {leases.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14 }}>
              <p style={{ color: 'var(--mid)' }}>No active leases tracked yet.</p>
            </div>
          ) : (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ background: 'var(--cream)' }}>
                    {['Tenant', 'Room', 'Ends', 'Days Left', 'Decision'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontWeight: 700, color: 'var(--mid)', fontSize: '0.75rem', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leases.slice(0, 10).map((l, i) => (
                    <tr key={l.id} style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none', background: leaseRowBg(l.days_remaining) }}>
                      <td style={{ padding: '0.6rem 0.75rem', fontWeight: 500, color: leaseTextColour(l.days_remaining) }}>
                        {l.tenant?.profile?.full_name ?? '—'}
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', color: 'var(--mid)' }}>
                        {l.room?.property?.title ?? ''} {l.room?.room_number ? `#${l.room.room_number}` : ''}
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', color: 'var(--mid)' }}>
                        {new Date(l.lease_end_date).toLocaleDateString('sw-TZ')}
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: leaseTextColour(l.days_remaining) }}>
                        {l.days_remaining}d {leaseBadge(l.days_remaining)}
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem' }}>
                        <span style={{ fontSize: '0.75rem', color: l.renewal_decision === 'leaving' ? '#dc2626' : l.renewal_decision === 'renewing' ? '#22c55e' : '#94a3b8' }}>
                          {l.renewal_decision ?? 'Undecided'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Inquiry Inbox ─────────────────────────────────── */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontFamily: " sans-serif", fontSize: '1rem' }}>
              Inquiry Inbox {pendingInquiries.length > 0 && (
                <span style={{ marginLeft: '0.4rem', fontSize: '0.75rem', fontWeight: 700, background: 'var(--amber-light)', color: '#6b3a0a', borderRadius: 99, padding: '0.1rem 0.45rem' }}>
                  {pendingInquiries.length}
                </span>
              )}
            </h3>
            <Link to="/landlord/inquiries" style={{ fontSize: '0.82rem', color: 'var(--jade)', fontWeight: 600 }}>All →</Link>
          </div>
          {inqLoading ? (
            <div style={{ display: 'grid', gap: '0.6rem' }}><SkeletonCard variant="row" count={3} /></div>
          ) : pendingInquiries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14 }}>
              <p style={{ color: 'var(--mid)' }}>No pending inquiries.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.7rem' }}>
              {pendingInquiries.slice(0, 5).map(inq => (
                <InquiryCard key={inq.id} inquiry={inq} view="host" onAccept={handleAccept} onDecline={handleDecline} />
              ))}
            </div>
          )}
        </section>

        {/* ── Listing Views ─────────────────────────────────── */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontFamily: " sans-serif", fontSize: '1rem' }}>
              <Building2 size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Property Views
            </h3>
            <Link to="/landlord/properties" style={{ fontSize: '0.82rem', color: 'var(--jade)', fontWeight: 600 }}>Manage →</Link>
          </div>
          {listLoading ? (
            <SkeletonCard variant="kpi" count={3} />
          ) : listings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14 }}>
              <p style={{ color: 'var(--mid)', marginBottom: '0.6rem' }}>No listings yet.</p>
              <Link to="/landlord/properties/new" className="btn btn--small">Add a listing</Link>
            </div>
          ) : (() => {
            const maxViews = Math.max(...listings.map(l => l.views ?? 0), 1);
            return (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '1rem', display: 'grid', gap: '0.6rem' }}>
                {listings.slice(0, 6).map(l => {
                  const pct = Math.round(((l.views ?? 0) / maxViews) * 100);
                  return (
                    <div key={l.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 6, overflow: 'hidden', background: '#f1f5f9', flexShrink: 0, border: '1px solid var(--border)' }}>
                        <img 
                          src={l.imageUrl || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=80&q=80'} 
                          alt="" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>{l.title}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--mid)', flexShrink: 0 }}>{l.views ?? 0} views</span>
                        </div>
                        <div style={{ height: 4, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: 'var(--jade)', borderRadius: 99, transition: 'width 0.4s ease' }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </section>

        {/* ── Recent Activity ───────────────────────────────── */}
        <section>
          <h3 style={{ fontFamily: " sans-serif", fontSize: '1rem', marginBottom: '0.75rem' }}>Recent Activity</h3>
          {actLoading ? (
            <div style={{ display: 'grid', gap: '0.65rem' }}><SkeletonCard variant="activity" count={4} /></div>
          ) : events.length === 0 ? (
            <p style={{ color: 'var(--mid)', fontSize: '0.86rem' }}>No activity yet.</p>
          ) : (
            <div style={{ display: 'grid', gap: '0.6rem' }}>
              {events.map(ev => (
                <div key={ev.id} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', padding: '0.65rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--jade-muted)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <Zap size={12} style={{ color: 'var(--jade)' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.84rem', fontWeight: 500, color: 'var(--ink)' }}>{ev.description}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--mid)', marginTop: '0.1rem' }}>{formatDate(ev.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
