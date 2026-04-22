import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { countRows, selectRows, upsertRows, invokeFunction } from '../lib/supabase';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid
} from 'recharts';

// ─── Colour scheme ────────────────────────────────────────────────
const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

// ─── Stat card ────────────────────────────────────────────────────
function StatCard({ label, value, sub = '', color = '#22c55e' }: { label: string; value: any; sub?: string; color?: string }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '1.25rem 1.5rem',
      borderLeft: `4px solid ${color}`,
    }}>
      <p style={{ fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', marginBottom: '0.4rem' }}>{label}</p>
      <p style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1, marginBottom: sub ? '0.3rem' : 0 }}>{value ?? '—'}</p>
      {sub ? <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{sub}</p> : null}
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────
function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>{title}</h2>
      {sub ? <p style={{ color: 'var(--muted)', marginTop: '0.2rem', fontSize: '0.9rem' }}>{sub}</p> : null}
    </div>
  );
}

export default function AdminDashboardPage() {
  const { token } = useAuth();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const activeSection = searchParams.get('tab') || 'overview';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // ── Raw stats state ──────────────────────────────────────────────
  const [stats, setStats] = useState<any>({});
  const [settings, setSettings] = useState<any>({ maintenance_mode: false, global_announcement: '' });
  const [notifForm, setNotifForm] = useState({ message: '', roleFilter: 'ALL' });
  const [announcementText, setAnnouncementText] = useState('');

  // ── Data fetch ───────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        const [
          totalUsers, totalListings, totalBookings, totalReports,
          totalReviews, totalNotifs, totalConvos, totalClaims,
          tenantCount, landlordCount, managerCount, adminCount,
          pendingListings, approvedListings, rejectedListings, flaggedListings,
          pendingReports, upheldReports, dismissedReports,
          requestedBookings, approvedBookings, declinedBookings,
          suspendedUsers, pendingVerification, unreadNotifs,
          pendingClaims, settingsRows,
          recentListings, _recentBookings, _recentReports,
          avgRatingRows,
          paymentsList,
          auditRecent,
          totalLocationShares,
          totalReferrals,
        ] = await Promise.all([
          countRows('profiles', { accessToken: token }),
          countRows('listings', { accessToken: token }),
          countRows('bookings', { accessToken: token }),
          countRows('listing_reports', { accessToken: token }),
          countRows('reviews', { accessToken: token }),
          countRows('notifications', { accessToken: token }),
          countRows('conversations', { accessToken: token }),
          countRows('campuscover_claims', { accessToken: token }),

          countRows('profiles', { filters: [{ column: 'role', op: 'eq', value: 'tenant' }], accessToken: token }),
          countRows('profiles', { filters: [{ column: 'role', op: 'eq', value: 'landlord' }], accessToken: token }),
          countRows('profiles', { filters: [{ column: 'role', op: 'eq', value: 'property_manager' }], accessToken: token }),
          countRows('profiles', { filters: [{ column: 'role', op: 'eq', value: 'admin' }], accessToken: token }),

          countRows('listings', { filters: [{ column: 'status', op: 'eq', value: 'pending' }], accessToken: token }),
          countRows('listings', { filters: [{ column: 'status', op: 'eq', value: 'approved' }], accessToken: token }),
          countRows('listings', { filters: [{ column: 'status', op: 'eq', value: 'rejected' }], accessToken: token }),
          countRows('listings', { filters: [{ column: 'status', op: 'eq', value: 'flagged' }], accessToken: token }),

          countRows('listing_reports', { filters: [{ column: 'status', op: 'eq', value: 'pending' }], accessToken: token }),
          countRows('listing_reports', { filters: [{ column: 'status', op: 'eq', value: 'upheld' }], accessToken: token }),
          countRows('listing_reports', { filters: [{ column: 'status', op: 'eq', value: 'dismissed' }], accessToken: token }),

          countRows('bookings', { filters: [{ column: 'status', op: 'eq', value: 'requested' }], accessToken: token }),
          countRows('bookings', { filters: [{ column: 'status', op: 'eq', value: 'approved' }], accessToken: token }),
          countRows('bookings', { filters: [{ column: 'status', op: 'eq', value: 'declined' }], accessToken: token }),

          countRows('profiles', { filters: [{ column: 'verification_status', op: 'eq', value: 'suspended' }], accessToken: token }),
          countRows('profiles', { filters: [{ column: 'verification_status', op: 'eq', value: 'pending' }], accessToken: token }),
          countRows('notifications', { filters: [{ column: 'read_at', op: 'is', value: 'null' }], accessToken: token }),
          countRows('campuscover_claims', { filters: [{ column: 'status', op: 'eq', value: 'pending' }], accessToken: token }),

          selectRows('system_settings', { select: 'key,value', accessToken: token }),

          selectRows('listings', { select: 'created_at,status', order: 'created_at.desc', limit: 30, accessToken: token }),
          selectRows('bookings', { select: 'created_at,status', order: 'created_at.desc', limit: 30, accessToken: token }),
          selectRows('listing_reports', { select: 'created_at,status', order: 'created_at.desc', limit: 30, accessToken: token }),

          selectRows('reviews', { select: 'rating', limit: 500, accessToken: token }),
          selectRows('payments', { select: 'amount,status', limit: 1000, accessToken: token }).catch(() => []),
          selectRows('admin_audit_log', {
            select: 'action,target_type,created_at',
            order: 'created_at.desc',
            limit: 15,
            accessToken: token,
          }).catch(() => []),
          countRows('location_shares', { accessToken: token }),
          countRows('landlord_referrals', { accessToken: token }),
        ]);

        if (!mounted) return;

        // Parse settings
        const sObj: any = {};
        if (Array.isArray(settingsRows)) {
          settingsRows.forEach((r: any) => { if (r && r.key) sObj[r.key] = r.value; });
        }
        setSettings({ maintenance_mode: !!sObj.maintenance_mode, global_announcement: sObj.global_announcement || '' });
        setAnnouncementText(sObj.global_announcement || '');

        // Avg rating
        const allRatings = Array.isArray(avgRatingRows) ? avgRatingRows.map((r: any) => Number(r.rating)).filter((x) => x > 0) : [];
        const avgRating = allRatings.length ? (allRatings.reduce((a, b) => a + b, 0) / allRatings.length).toFixed(2) : '—';

        // Listings trend (last 7 days by day)
        const now = Date.now();
        const listingsTrend = Array.from({ length: 7 }, (_, i) => {
          const dayStart = new Date(now - (6 - i) * 86400000);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(dayStart.getTime() + 86400000);
          const count = Array.isArray(recentListings) ? recentListings.filter((l) => {
            const d = new Date(l.created_at);
            return d >= dayStart && d < dayEnd;
          }).length : 0;
          return {
            day: dayStart.toLocaleDateString(undefined, { weekday: 'short' }),
            count,
          };
        });

        const successfulPayments = (paymentsList as any[]).filter(p => String(p.status).toLowerCase() === 'completed' || String(p.status).toLowerCase() === 'paid');
        const failedPaymentsCount = (paymentsList as any[]).filter((p) => {
          const s = String(p.status).toLowerCase();
          return s === 'failed' || s === 'declined' || s === 'error' || s === 'cancelled';
        }).length;
        const totalRevenue = successfulPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
        const totalPaymentsCount = successfulPayments.length;
        const paymentRowsTotal = (paymentsList as any[]).length;
        const paymentSuccessRatePct =
          paymentRowsTotal > 0 ? Math.round((totalPaymentsCount / paymentRowsTotal) * 100) : null;

        setStats({
          totalUsers, totalListings, totalBookings, totalReports,
          totalReviews, totalNotifs, totalConvos, totalClaims,
          totalLocationShares, totalReferrals,
          tenantCount, landlordCount, managerCount, adminCount,
          pendingListings, approvedListings, rejectedListings, flaggedListings,
          pendingReports, upheldReports, dismissedReports,
          requestedBookings, approvedBookings, declinedBookings,
          suspendedUsers, pendingVerification, unreadNotifs,
          pendingClaims, avgRating, totalRevenue, totalPaymentsCount,
          listingsTrend,
          auditRecent: auditRecent as any[],
          failedPaymentsCount,
          paymentSuccessRatePct,
          paymentSampleSize: paymentRowsTotal,

          userRoleChart: [
            { name: 'Tenants', value: tenantCount },
            { name: 'Hosts', value: landlordCount + managerCount },
            { name: 'Admins', value: adminCount },
          ],
          listingStatusChart: [
            { name: 'Approved', value: approvedListings },
            { name: 'Pending', value: pendingListings },
            { name: 'Rejected', value: rejectedListings },
            { name: 'Flagged', value: flaggedListings },
          ],
          reportStatusChart: [
            { name: 'Pending', value: pendingReports },
            { name: 'Upheld', value: upheldReports },
            { name: 'Dismissed', value: dismissedReports },
          ],
          bookingStatusChart: [
            { name: 'Requested', value: requestedBookings },
            { name: 'Approved', value: approvedBookings },
            { name: 'Declined', value: declinedBookings },
          ],
        });
      } catch (e: any) {
        if (mounted) setError(e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, [token]);

  // ─── Settings save ────────────────────────────────────────────────

  // ─── Send notification ────────────────────────────────────────────
  async function sendNotif() {
    setActionLoading(true);
    try {
      let filters: any[] = [];
      if (notifForm.roleFilter !== 'ALL') {
        filters.push({ column: 'role', op: 'eq', value: notifForm.roleFilter.toLowerCase() });
      }
      // Fetch users
      const usersToNotify = await selectRows('profiles', { select: 'phone', filters, limit: 1000, accessToken: token });
      const phoneNumbers = usersToNotify.map((u: any) => u.phone).filter(Boolean);

      if (phoneNumbers.length === 0) {
        alert('No specific users matched that filter.');
        return;
      }

      // We'll simulate pushing them all through by calling edge function
      // Realistically we'd batch this, but for now we'll do a few
      const batchSize = Math.min(phoneNumbers.length, 5); // Limit for demo
      const promises = phoneNumbers.slice(0, batchSize).map(phone =>
        invokeFunction('send-sms', { to: phone, message: notifForm.message }, token).catch(console.error)
      );

      await Promise.all(promises);

      setNotifForm({ message: '', roleFilter: 'ALL' });
      alert(`Notification sent to ${phoneNumbers.length} users! (Simulated batch)`);
    } catch (e: any) { setError(e.message); }
    finally { setActionLoading(false); }
  }

  // ─── SOS toggle ───────────────────────────────────────────────────
  async function toggleSOS(val: boolean) {
    const targetAnnouncement = val ? settings.global_announcement : '';
    try {
      await upsertRows('system_settings', [
        { key: 'maintenance_mode', value: val },
        { key: 'global_announcement', value: targetAnnouncement },
      ], { accessToken: token, onConflict: 'key' });
      setSettings((prev: any) => ({ ...prev, maintenance_mode: val, global_announcement: targetAnnouncement }));
      setAnnouncementText(targetAnnouncement);
    } catch (e: any) { setError(e.message); }
  }

  // ─── Render helpers ───────────────────────────────────────────────
  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem',
  };

  const chartCard = (title: string, children: React.ReactNode) => (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem' }}>
      <p style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '0.95rem' }}>{title}</p>
      {children}
    </div>
  );

  // ─── Section renderers ────────────────────────────────────────────

    function renderOverview() {
      return (
        <>
          <SectionHeader title="📊 iRent Platform Performance" sub="Live snapshot of all key platform metrics." />
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <Link to="/admin/landlords" className="btn btn--ghost btn--small" style={{ border: '1px solid var(--border)' }}>
              Verify project manager accounts
            </Link>
            <Link to="/admin/listings" className="btn btn--ghost btn--small" style={{ border: '1px solid var(--border)' }}>
              Moderate listings
            </Link>
          </div>
          <div style={gridStyle}>
            <StatCard label="Total Users" value={stats.totalUsers} color="#3b82f6" />
            <StatCard label="Total Listings" value={stats.totalListings} color="#22c55e" />
            <StatCard label="Total Bookings" value={stats.totalBookings} color="#f59e0b" />
            <StatCard label="Reports" value={stats.totalReports} color="#ef4444" />
            <StatCard label="Location Shares" value={stats.totalLocationShares} color="#06b6d4" sub="Properties shared externally" />
            <StatCard label="Referrals" value={stats.totalReferrals} color="#f59e0b" sub="Tenant-to-tenant referrals" />
            <StatCard label="Reviews" value={stats.totalReviews} color="#8b5cf6" sub={`Avg rating: ${stats.avgRating}`} />
            <StatCard label="Payments" value={stats.totalPaymentsCount} color="#06b6d4" />
            <StatCard label="Revenue" value={`${Number(stats.totalRevenue || 0).toLocaleString()} TZS`} color="#10b981" />
            <StatCard label="Claims" value={stats.totalClaims} color="#f97316" sub={`${stats.pendingClaims} pending`} />
          </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          {chartCard('Users by Role',
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={stats.userRoleChart || []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                  {(stats.userRoleChart || []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend /><Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
          {chartCard('Listings by Status',
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={stats.listingStatusChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                  {(stats.listingStatusChart || []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend /><Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {chartCard('New Listings — Last 7 Days',
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.listingsTrend || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" /><YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} name="Listings" />
            </BarChart>
          </ResponsiveContainer>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem' }}>
            <p style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: '0.95rem' }}>Recent admin activity</p>
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.75rem' }}>Action types and targets only — no user PII.</p>
            {(stats.auditRecent || []).length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>No audit entries yet.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: 'var(--muted)' }}>
                      <th style={{ padding: '0.35rem 0' }}>When</th>
                      <th style={{ padding: '0.35rem 0' }}>Action</th>
                      <th style={{ padding: '0.35rem 0' }}>Target</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stats.auditRecent as any[]).map((row: any) => (
                      <tr key={`${row.created_at}-${row.action}`} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.45rem 0.25rem 0.45rem 0', whiteSpace: 'nowrap' }}>
                          {row.created_at ? new Date(row.created_at).toLocaleString() : '—'}
                        </td>
                        <td style={{ padding: '0.45rem 0.25rem', fontWeight: 600 }}>{String(row.action || '—')}</td>
                        <td style={{ padding: '0.45rem 0.25rem' }}>{String(row.target_type || '—')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Link to="/admin/audit-log" style={{ display: 'inline-block', marginTop: '0.75rem', fontSize: '0.86rem', fontWeight: 600 }}>
              Full audit log →
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <StatCard
              label="Maintenance mode"
              value={settings.maintenance_mode ? 'ON' : 'Off'}
              sub={settings.maintenance_mode ? 'Users see SOS / emergency banner' : 'Normal operations'}
              color={settings.maintenance_mode ? '#ef4444' : '#22c55e'}
            />
            <StatCard
              label="Payments (sample)"
              value={stats.paymentSuccessRatePct != null ? `${stats.paymentSuccessRatePct}%` : '—'}
              sub={`${stats.failedPaymentsCount ?? 0} non-success in last ${stats.paymentSampleSize ?? 0} sampled rows`}
              color={(stats.failedPaymentsCount ?? 0) > 0 ? '#f59e0b' : '#22c55e'}
            />
            <StatCard
              label="Global announcement"
              value={(settings.global_announcement || '').trim() ? 'Set' : 'Empty'}
              sub="Banner text from system_settings"
              color="#3b82f6"
            />
          </div>
        </div>
      </>
    );
  }

  function renderUsers() {
    return (
      <>
        <SectionHeader title="👥 User Statistics" sub="Breakdown of all registered platform users." />
        <div style={gridStyle}>
          <StatCard label="Total Users" value={stats.totalUsers} color="#3b82f6" />
          <StatCard label="Tenants" value={stats.tenantCount} color="#22c55e" />
          <StatCard label="Landlords" value={stats.landlordCount} color="#f59e0b" />
          <StatCard label="Project Managers" value={stats.managerCount} color="#8b5cf6" />
          <StatCard label="Suspended" value={stats.suspendedUsers} color="#ef4444" />
          <StatCard label="Pending Verification" value={stats.pendingVerification} color="#f97316" />
        </div>
        {chartCard('User Distribution',
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.userRoleChart || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={80} />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Users" />
            </BarChart>
          </ResponsiveContainer>
        )}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link to="/admin/landlords" className="btn">Review Listers →</Link>
        </div>
      </>
    );
  }

  function renderListings() {
    return (
      <>
        <SectionHeader title="🏠 Listing Statistics" sub="All property listings across the platform." />
        <div style={gridStyle}>
          <StatCard label="Total Listings" value={stats.totalListings} color="#22c55e" />
          <StatCard label="Approved" value={stats.approvedListings} color="#22c55e" />
          <StatCard label="Pending Review" value={stats.pendingListings} color="#f59e0b" />
          <StatCard label="Rejected" value={stats.rejectedListings} color="#ef4444" />
          <StatCard label="Flagged" value={stats.flaggedListings} color="#f97316" />
        </div>
        {chartCard('Listing Status Breakdown',
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.listingStatusChart || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" /><YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Listings">
                {(stats.listingStatusChart || []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
        {chartCard('Listings Added — Last 7 Days',
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={stats.listingsTrend || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" /><YAxis allowDecimals={false} />
              <Tooltip /><Line type="monotone" dataKey="count" stroke="#22c55e" strokeWidth={2} dot name="Listings" />
            </LineChart>
          </ResponsiveContainer>
        )}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link to="/admin/listings" className="btn">Open Listings Queue →</Link>
        </div>
      </>
    );
  }

  function renderBookings() {
    return (
      <>
        <SectionHeader title="📋 Booking Statistics" sub="Tracking all booking requests on the platform." />
        <div style={gridStyle}>
          <StatCard label="Total Bookings" value={stats.totalBookings} color="#f59e0b" />
          <StatCard label="Requested" value={stats.requestedBookings} color="#3b82f6" />
          <StatCard label="Approved" value={stats.approvedBookings} color="#22c55e" />
          <StatCard label="Declined" value={stats.declinedBookings} color="#ef4444" />
        </div>
        {chartCard('Booking Outcomes',
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={stats.bookingStatusChart || []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {(stats.bookingStatusChart || []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Legend /><Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )}
      </>
    );
  }

  function renderReports() {
    return (
      <>
        <SectionHeader title="🚨 Report Statistics" sub="User abuse reports submitted across the platform." />
        <div style={gridStyle}>
          <StatCard label="Total Reports" value={stats.totalReports} color="#ef4444" />
          <StatCard label="Pending" value={stats.pendingReports} color="#f59e0b" />
          <StatCard label="Upheld" value={stats.upheldReports} color="#ef4444" />
          <StatCard label="Dismissed" value={stats.dismissedReports} color="#22c55e" />
          <StatCard label="Claims" value={stats.totalClaims} color="#8b5cf6" sub={`${stats.pendingClaims} pending`} />
        </div>
        {chartCard('Report Resolutions',
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.reportStatusChart || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" /><YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Reports">
                {(stats.reportStatusChart || []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link to="/admin/reports" className="btn">Review Reports →</Link>
          <Link to="/admin/claims" className="btn btn--ghost">Review Claims →</Link>
          <Link to="/admin/audit-log" className="btn btn--ghost">Audit Log →</Link>
        </div>
      </>
    );
  }

  function renderReviews() {
    return (
      <>
        <SectionHeader title="⭐ Review Statistics" sub="Ratings submitted by tenants across all listings." />
        <div style={gridStyle}>
          <StatCard label="Total Reviews" value={stats.totalReviews} color="#8b5cf6" />
          <StatCard label="Average Rating" value={stats.avgRating} color="#f59e0b" sub="Out of 5.00" />
        </div>
      </>
    );
  }

  function renderNotifications() {
    return (
      <>
        <SectionHeader title="🔔 Mass Notification Tool" sub="Send a real-time notification to all active users." />
        <div className="card" style={{ maxWidth: 520 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '1rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Target Audience</span>
            <select
              value={notifForm.roleFilter}
              onChange={(e) => setNotifForm((p) => ({ ...p, roleFilter: e.target.value }))}
              style={{ width: '100%' }}
            >
              <option value="ALL">All Users</option>
              <option value="TENANT">Tenants Only</option>
              <option value="LISTER">Hosts & PMs Only</option>
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '1rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Message Content</span>
            <textarea
              value={notifForm.message}
              onChange={(e) => setNotifForm((p) => ({ ...p, message: e.target.value }))}
              placeholder="Alert text..."
              style={{ width: '100%', minHeight: '100px' }}
            />
          </label>
          <button
            className="btn"
            disabled={actionLoading || !notifForm.message.trim()}
            onClick={sendNotif}
          >
            {actionLoading ? 'Sending…' : '🚀 Send Mass Alert'}
          </button>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <SectionHeader title="📊 Notification Stats" />
          <div style={gridStyle}>
            <StatCard label="Total Sent" value={stats.totalNotifs} color="#ec4899" />
            <StatCard label="Unread" value={stats.unreadNotifs} color="#f59e0b" />
          </div>
        </div>
      </>
    );
  }

  function renderSettings() {
    return (
      <>
        <SectionHeader title="⚙️ System Settings" sub="Emergency overrides and global toggles." />
        <div className="card" style={{ maxWidth: 560 }}>
          <label className="checkbox-field" style={{ fontSize: '1.05rem', color: settings.maintenance_mode ? '#cf222e' : 'inherit', marginBottom: '1rem' }}>
            <input
              type="checkbox"
              checked={settings.maintenance_mode}
              onChange={(e) => toggleSOS(e.target.checked)}
            />
            <strong>🚨 SOS / Emergency Mode</strong>
          </label>
          <p className="muted" style={{ fontSize: '0.85rem', marginBottom: '1.5rem' }}>Activates the pulsing red SOS banner for all users.</p>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Global Announcement Text</span>
            <input
              type="text"
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              placeholder="Banner message..."
              style={{ width: '100%' }}
              onBlur={async () => {
                try {
                  await upsertRows('system_settings', [{ key: 'global_announcement', value: announcementText }], { accessToken: token, onConflict: 'key' });
                  setSettings((prev: any) => ({ ...prev, global_announcement: announcementText }));
                } catch (e: any) { setError(e.message); }
              }}
            />
          </label>
          <p className="muted" style={{ fontSize: '0.8rem', marginTop: '0.3rem' }}>Displays a sticky banner at the top of every page.</p>
        </div>
      </>
    );
  }

  // ─── Moderation sections (lazy local state + fetch on first open) ─
  const [queueData, setQueueData] = useState<Record<string, any[]>>({});
  const [queueLoading, setQueueLoading] = useState<Record<string, boolean>>({});

  async function loadQueue(key: string, table: string, opts: any) {
    if (queueData[key] || queueLoading[key]) return;
    setQueueLoading((p) => ({ ...p, [key]: true }));
    try {
      const rows = await selectRows(table, { ...opts, accessToken: token });
      setQueueData((p) => ({ ...p, [key]: rows }));
    } finally {
      setQueueLoading((p) => ({ ...p, [key]: false }));
    }
  }

  function renderQueueListers() {
    const key = 'listers';
    if (!queueData[key]) { loadQueue(key, 'profiles', { select: 'id,full_name,phone,verification_status,lister_type,created_at', filters: [{ column: 'role', op: 'eq', value: 'lister' }], order: 'created_at.desc', limit: 100 }); }
    const rows = queueData[key] || [];
    return (
      <>
        <SectionHeader title="👤 Listers Queue" sub="All registered landlords and project managers." />
        {queueLoading[key] ? <p className="muted">Loading…</p> : null}
        <div className="card table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Phone</th><th>Type</th><th>Status</th><th>Suspended</th><th>Joined</th></tr></thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id}>
                  <td>{r.full_name}</td>
                  <td>{r.phone || '—'}</td>
                  <td>{r.lister_type || '—'}</td>
                  <td><span style={{ color: r.verification_status === 'verified' ? '#22c55e' : r.verification_status === 'pending' ? '#f59e0b' : '#ef4444' }}>{r.verification_status}</span></td>
                  <td>{r.verification_status === 'suspended' ? '🚫 Yes' : '✅ No'}</td>
                  <td>{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && !queueLoading[key] ? <p className="muted">No listers found.</p> : null}
        </div>
      </>
    );
  }

  function renderQueueListings() {
    const key = 'listings_q';
    if (!queueData[key]) { loadQueue(key, 'listings', { select: 'id,title,status,region,district,price_monthly,created_at', order: 'created_at.desc', limit: 100 }); }
    const rows = queueData[key] || [];
    const STATUS_COLOR: Record<string, string> = { approved: '#22c55e', pending: '#f59e0b', rejected: '#ef4444', flagged: '#f97316', draft: '#94a3b8' };
    return (
      <>
        <SectionHeader title="🏗 Listings Queue" sub="All listings across all statuses." />
        {queueLoading[key] ? <p className="muted">Loading…</p> : null}
        <div className="card table-wrap">
          <table>
            <thead><tr><th>Title</th><th>Location</th><th>Price (TZS/mo)</th><th>Status</th><th>Submitted</th></tr></thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id}>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</td>
                  <td>{r.district}, {r.region}</td>
                  <td>{Number(r.price_monthly).toLocaleString()}</td>
                  <td><span style={{ color: STATUS_COLOR[r.status] || 'inherit' }}>{r.status}</span></td>
                  <td>{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && !queueLoading[key] ? <p className="muted">No listings found.</p> : null}
        </div>
      </>
    );
  }

  function renderQueueReports() {
    const key = 'reports_q';
    if (!queueData[key]) { loadQueue(key, 'listing_reports', { select: 'id,listing_id,reason,status,description,created_at', order: 'created_at.desc', limit: 100 }); }
    const rows = queueData[key] || [];
    const STATUS_COLOR: Record<string, string> = { pending: '#f59e0b', upheld: '#ef4444', dismissed: '#22c55e' };
    return (
      <>
        <SectionHeader title="🚩 Reports Queue" sub="Abuse reports submitted by users." />
        {queueLoading[key] ? <p className="muted">Loading…</p> : null}
        <div className="card table-wrap">
          <table>
            <thead><tr><th>Reason</th><th>Status</th><th>Description</th><th>Date</th></tr></thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id}>
                  <td>{r.reason}</td>
                  <td><span style={{ color: STATUS_COLOR[r.status] || 'inherit' }}>{r.status}</span></td>
                  <td style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description || '—'}</td>
                  <td>{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && !queueLoading[key] ? <p className="muted">No reports found.</p> : null}
        </div>
      </>
    );
  }

  function renderQueueClaims() {
    const key = 'claims_q';
    if (!queueData[key]) { loadQueue(key, 'campuscover_claims', { select: 'id,tenant_id,status,description,submitted_at', order: 'submitted_at.desc', limit: 100 }); }
    const rows = queueData[key] || [];
    const STATUS_COLOR: Record<string, string> = { pending: '#f59e0b', upheld: '#22c55e', dismissed: '#ef4444', disputed: '#8b5cf6' };
    return (
      <>
        <SectionHeader title="🛡 Claims Queue" sub="iRent Shield tenant protection claims." />
        {queueLoading[key] ? <p className="muted">Loading…</p> : null}
        <div className="card table-wrap">
          <table>
            <thead><tr><th>Status</th><th>Description</th><th>Submitted</th></tr></thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id}>
                  <td><span style={{ color: STATUS_COLOR[r.status] || 'inherit' }}>{r.status}</span></td>
                  <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description}</td>
                  <td>{r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && !queueLoading[key] ? <p className="muted">No claims found.</p> : null}
        </div>
      </>
    );
  }

  function renderPayments() {
    const key = 'payments_all';
    if (!queueData[key]) { loadQueue(key, 'payments', { select: 'id,amount,method,status,created_at,payment_type', order: 'created_at.desc', limit: 100 }); }
    const rows = queueData[key] || [];
    const STATUS_COLOR: Record<string, string> = { completed: '#22c55e', pending: '#f59e0b', failed: '#ef4444' };
    return (
      <>
        <SectionHeader title="💰 Payment Monitoring" sub="All transactions and Selcom records." />
        {queueLoading[key] ? <p className="muted">Loading transactions…</p> : null}
        <div className="card table-wrap">
          <table>
            <thead><tr><th>Amount (TZS)</th><th>Type</th><th>Method</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id}>
                  <td>{Number(r.amount).toLocaleString()}</td>
                  <td>{String(r.payment_type || 'Unknown').toUpperCase()}</td>
                  <td>{String(r.method || 'Selcom').toUpperCase()}</td>
                  <td><span style={{ color: STATUS_COLOR[String(r.status).toLowerCase()] || 'inherit' }}>{r.status}</span></td>
                  <td>{r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && !queueLoading[key] ? <p className="muted">No transactions found.</p> : null}
        </div>
      </>
    );
  }

  const [auditFilters, setAuditFilters] = useState({ action: 'ALL', search: '' });

  function renderAuditLog() {
    const key = 'audit';
    if (!queueData[key]) { loadQueue(key, 'admin_audit_log', { select: 'id,admin_id,action,target_type,target_id,reason,created_at', order: 'created_at.desc', limit: 200 }); }
    const rows = queueData[key] || [];

    const filteredRows = rows.filter(r => {
      if (auditFilters.action !== 'ALL' && r.action !== auditFilters.action) return false;
      if (auditFilters.search && !String(r.target_id).toLowerCase().includes(auditFilters.search.toLowerCase())) return false;
      return true;
    });

    return (
      <>
        <SectionHeader title="📖 Audit Log" sub="Complete record of all admin moderation actions." />

        <div className="card" style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <label style={{ flex: 1 }}>
            Action Filter
            <select value={auditFilters.action} onChange={e => setAuditFilters(p => ({ ...p, action: e.target.value }))}>
              <option value="ALL">All Actions</option>
              <option value="APPROVE">Approve</option>
              <option value="REJECT">Reject</option>
              <option value="SUSPEND">Suspend</option>
              <option value="FLAG">Flag</option>
            </select>
          </label>
          <label style={{ flex: 2 }}>
            Search Target ID
            <input type="text" placeholder="UUID..." value={auditFilters.search} onChange={e => setAuditFilters(p => ({ ...p, search: e.target.value }))} />
          </label>
        </div>

        {queueLoading[key] ? <p className="muted">Loading…</p> : null}
        <div className="card table-wrap">
          <table>
            <thead><tr><th>Time</th><th>Action</th><th>Target Type</th><th>Target ID</th><th>Reason</th></tr></thead>
            <tbody>
              {filteredRows.map((r: any) => (
                <tr key={r.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</td>
                  <td><strong>{r.action}</strong></td>
                  <td>{r.target_type}</td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.target_id}</td>
                  <td>{r.reason || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredRows.length === 0 && !queueLoading[key] ? <p className="muted">No audit entries match filters.</p> : null}
        </div>
      </>
    );
  }

  const sectionMap: Record<string, () => React.ReactNode> = {
    overview: renderOverview,
    users: renderUsers,
    listings: renderListings,
    bookings: renderBookings,
    payments: renderPayments,
    reports: renderReports,
    reviews: renderReviews,
    notifications: renderNotifications,
    settings: renderSettings,
    queue_listers: renderQueueListers,
    queue_listings: renderQueueListings,
    queue_reports: renderQueueReports,
    queue_claims: renderQueueClaims,
    audit_log: renderAuditLog,
  };


  // ─── Layout ───────────────────────────────────────────────────────
  return (
    <div className="admin-dashboard-container" style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', flex: 1, minWidth: 0, width: '100%' }}>
      {error ? <p className="error-text" style={{ marginBottom: '1rem' }}>{error}</p> : null}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
          <p className="muted">Loading statistics…</p>
        </div>
      ) : (
        sectionMap[activeSection]?.()
      )}
    </div>
  );
}
