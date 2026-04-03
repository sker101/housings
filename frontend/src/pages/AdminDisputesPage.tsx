import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { selectRows, updateRows, countRows } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

const REASON_LABELS: Record<string, string> = {
  fraud: '⚠️ Fraud / Scam',
  photos_mismatch: '📷 Photos Mismatch',
  misleading_price: '💸 Misleading Price',
  unsafe: '🔒 Unsafe Property',
  harassment: '😠 Harassment',
  already_rented: '🔑 Already Rented',
  unconducive: '🏚️ Bad Environment',
};

export default function AdminDisputesPage() {
  const { token } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [isLoading, setIsLoading] = useState(true);
  const [counts, setCounts] = useState({ pending: 0, upheld: 0, dismissed: 0 });
  const [actingId, setActingId] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
    loadCounts();
  }, [activeTab, token]);

  const loadCounts = async () => {
    if (!token) return;
    try {
      const [pending, upheld, dismissed] = await Promise.all([
        countRows('listing_reports', { filters: [{ column: 'status', op: 'eq', value: 'pending' }], accessToken: token }),
        countRows('listing_reports', { filters: [{ column: 'status', op: 'eq', value: 'upheld' }], accessToken: token }),
        countRows('listing_reports', { filters: [{ column: 'status', op: 'eq', value: 'dismissed' }], accessToken: token }),
      ]);
      setCounts({ pending, upheld, dismissed });
    } catch (err) {
      console.error('Failed to load counts:', err);
    }
  };

  const loadReports = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const rows = await selectRows('listing_reports', {
        select: 'id,listing_id,reporter_id,reason,description,reporter_has_booking,status,admin_note,created_at',
        filters: [{ column: 'status', op: 'eq', value: activeTab }],
        order: 'created_at.desc',
        limit: 100,
        accessToken: token,
      });

      if (rows.length === 0) { setReports([]); setIsLoading(false); return; }

      const listingIds = [...new Set(rows.map((r: any) => r.listing_id))];
      const listings = await selectRows('listings', {
        select: 'id,title',
        filters: [{ column: 'id', op: 'in', value: `(${listingIds.join(',')})` }],
        accessToken: token,
      });
      const listingMap = new Map(listings.map((l: any) => [l.id, l]));
      setReports(rows.map((r: any) => ({ ...r, listing: listingMap.get(r.listing_id) })));
    } catch (err) {
      toast.error('Failed to load reports');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const act = async (reportId: string, status: 'upheld' | 'dismissed', note = '') => {
    setActingId(reportId);
    try {
      await updateRows('listing_reports', { status, admin_note: note || null }, {
        filters: [{ column: 'id', op: 'eq', value: reportId }],
        accessToken: token,
      });
      toast.success(status === 'upheld' ? 'Report upheld' : 'Report dismissed');
      loadReports();
      loadCounts();
    } catch {
      toast.error('Action failed');
    } finally {
      setActingId(null);
    }
  };

  const handleUphold = async (r: any) => {
    const note = window.prompt(`Uphold report for "${r.listing?.title || r.listing_id}"?\n\nEnter admin note:`);
    if (note === null) return;
    await act(r.id, 'upheld', note);
  };

  const handleDismiss = async (r: any) => {
    const note = window.prompt(`Dismiss report for "${r.listing?.title || r.listing_id}"?\n\nEnter admin note:`);
    if (note === null) return;
    await act(r.id, 'dismissed', note);
  };

  const tabs = [
    { id: 'pending', label: 'Pending', count: counts.pending },
    { id: 'upheld', label: 'Upheld', count: counts.upheld },
    { id: 'dismissed', label: 'Dismissed', count: counts.dismissed },
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.5rem' }}>Dispute & Report Resolution</h1>
        <p style={{ color: '#6b7280' }}>Review and resolve user-submitted listing reports</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid #e5e7eb', marginBottom: '2rem' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'transparent',
              borderBottom: activeTab === tab.id ? '2px solid #0d7a6e' : '2px solid transparent',
              marginBottom: '-2px',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: activeTab === tab.id ? '700' : '500',
              color: activeTab === tab.id ? '#0d7a6e' : '#6b7280',
              border: 'none',
              transition: 'all 0.15s',
            }}
          >
            {tab.label}{' '}
            <span style={{
              marginLeft: '0.4rem',
              background: activeTab === tab.id ? '#0d7a6e' : '#e5e7eb',
              color: activeTab === tab.id ? '#fff' : '#6b7280',
              fontSize: '0.75rem',
              padding: '0.1rem 0.45rem',
              borderRadius: '999px',
              fontWeight: 700,
            }}>{tab.count}</span>
          </button>
        ))}
      </div>

      {isLoading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          <Loader size={32} style={{ margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }} />
          Loading reports...
        </div>
      )}

      {!isLoading && reports.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', background: '#f9fafb', borderRadius: '8px', color: '#6b7280' }}>
          <AlertCircle size={32} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          No {activeTab} reports found
        </div>
      )}

      <div style={{ display: 'grid', gap: '1rem' }}>
        {reports.map((r: any) => (
          <article key={r.id} style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '1.5rem',
            display: 'flex',
            gap: '1.5rem',
            justifyContent: 'space-between',
          }}>
            <div style={{ flex: 1 }}>
              <p style={{ marginBottom: '0.5rem', fontWeight: 600 }}>
                <Link to={`/rooms/${r.listing_id}`} target="_blank" rel="noopener noreferrer" style={{ color: '#0d7a6e', textDecoration: 'none' }}>
                  {r.listing?.title || `Listing: ${r.listing_id?.slice(0, 8)}…`}
                </Link>
              </p>
              <p style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                Reason: <strong>{REASON_LABELS[r.reason] || r.reason}</strong>
              </p>
              {r.description && (
                <p style={{ color: '#6b7280', fontSize: '0.88rem', marginBottom: '0.5rem' }}>
                  &ldquo;{r.description}&rdquo;
                </p>
              )}
              <p style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                {r.reporter_has_booking ? '🎫 Verified tenant' : '👤 Anonymous reporter'} ·{' '}
                {r.created_at ? new Date(r.created_at).toLocaleString() : '—'}
              </p>
              {r.admin_note && (
                <p style={{ marginTop: '0.5rem', padding: '0.4rem 0.75rem', background: '#f3f4f6', borderRadius: '6px', fontSize: '0.85rem', borderLeft: '3px solid #0d7a6e' }}>
                  Admin note: {r.admin_note}
                </p>
              )}
            </div>

            {activeTab === 'pending' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flexShrink: 0 }}>
                <button
                  onClick={() => handleUphold(r)}
                  disabled={actingId === r.id}
                  style={{ padding: '0.65rem 1.25rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem', opacity: actingId === r.id ? 0.6 : 1 }}
                >
                  {actingId === r.id ? '…' : 'Uphold'}
                </button>
                <button
                  onClick={() => handleDismiss(r)}
                  disabled={actingId === r.id}
                  style={{ padding: '0.65rem 1.25rem', background: '#f3f4f6', color: '#1f2937', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem', opacity: actingId === r.id ? 0.6 : 1 }}
                >
                  {actingId === r.id ? '…' : 'Dismiss'}
                </button>
              </div>
            )}
          </article>
        ))}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
