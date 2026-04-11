import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { selectRows, updateRows } from '../lib/supabase';

function formatDate(value) {
    if (!value) return '—';
    try { return new Date(value).toLocaleString(); } catch { return value; }
}

const REASON_LABELS = {
    fraud: '⚠️ Fraud / Scam',
    photos_mismatch: '📷 Photos Mismatch',
    misleading_price: '💸 Misleading Price',
    unsafe: '🔒 Unsafe Property',
    harassment: '😠 Harassment',
    already_rented: '🔑 Already Rented',
    unconducive: '🏚️ Bad Environment'
};

export default function AdminReportsPage() {
    const { token } = useAuth();
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState<'pending' | 'upheld' | 'dismissed'>('pending');
    const [actingId, setActingId] = useState<string | null>(null);

    async function loadReports() {
        if (!token) { setLoading(false); return; }
        setLoading(true);
        setError('');
        try {
            const rows = await selectRows('listing_reports', {
                select: 'id,listing_id,reporter_id,reason,description,reporter_has_booking,status,admin_note,created_at',
                filters: [{ column: 'status', op: 'eq', value: filter }],
                order: 'created_at.desc',
                limit: 200,
                accessToken: token
            });

            if (rows.length === 0) { setReports([]); setLoading(false); return; }

            // Enrich with listing titles
            const listingIds = Array.from(new Set(rows.map((r) => r.listing_id)));
            const listings = await selectRows('listings', {
                select: 'id,title,lister_id',
                filters: [{ column: 'id', op: 'in', value: `(${listingIds.join(',')})` }],
                accessToken: token
            });
            const listingMap = new Map(listings.map((l) => [l.id, l]));

            setReports(rows.map((r) => ({ ...r, listing: listingMap.get(r.listing_id) })));
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadReports();
         
    }, [token, filter]);

    const act = async (reportId: string, status: 'upheld' | 'dismissed', adminNote = '') => {
        setActingId(reportId);
        setError('');
        try {
            await updateRows(
                'listing_reports',
                { status, admin_note: adminNote || null },
                { filters: [{ column: 'id', op: 'eq', value: reportId }], accessToken: token }
            );
            await loadReports();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setActingId(null);
        }
    };

    const handleUphold = async (r: any) => {
        const note = window.prompt(`Uphold report for "${r.listing?.title || r.listing_id}"?\n\nEnter admin note (reason for decision):`);
        if (note === null) return; // cancelled
        await act(r.id, 'upheld', note);
    };

    const handleDismiss = async (r: any) => {
        const note = window.prompt(`Dismiss report for "${r.listing?.title || r.listing_id}"?\n\nEnter admin note:`);
        if (note === null) return;
        await act(r.id, 'dismissed', note);
    };

    return (
        <div className="container section">
            <div className="section__header">
                <div>
                    <h1>Listing Reports</h1>
                    <p>Review and resolve user-submitted reports. Upholding a report will auto-flag the listing.</p>
                </div>
                <Link to="/admin" className="btn btn--ghost btn--small">← Admin</Link>
            </div>

            {error ? <p className="error-text">{error}</p> : null}

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                {(['pending', 'upheld', 'dismissed'] as const).map((f) => (
                    <button
                        key={f}
                        type="button"
                        className={`btn btn--small ${filter === f ? '' : 'btn--ghost'}`}
                        onClick={() => setFilter(f)}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            {loading ? <p className="muted">Loading reports…</p> : null}
            {!loading && reports.length === 0 ? <section className="card"><p className="muted">No {filter} reports.</p></section> : null}

            {reports.map((r) => (
                <article key={r.id} className="moderation-card" style={{ marginBottom: '1rem' }}>
                    <div>
                        <p>
                            <strong>
                                <Link to={`/rooms/${r.listing_id}`} target="_blank" rel="noopener noreferrer">
                                    {r.listing?.title || r.listing_id}
                                </Link>
                            </strong>
                        </p>
                        <p>Reason: <strong>{REASON_LABELS[r.reason] || r.reason}</strong></p>
                        {r.description ? <p style={{ fontSize: '0.88rem', color: 'var(--muted)' }}>&ldquo;{r.description}&rdquo;</p> : null}
                        <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                            {r.reporter_has_booking ? '🎫 Verified tenant' : 'Anonymous reporter'} · {formatDate(r.created_at)}
                        </p>
                        {r.admin_note ? (
                            <p style={{ marginTop: '0.5rem', padding: '0.4rem 0.75rem', background: '#f3f4f6', borderRadius: '6px', fontSize: '0.85rem' }}>
                                Admin note: {r.admin_note}
                            </p>
                        ) : null}
                    </div>

                    {filter === 'pending' ? (
                        <div className="moderation-card__actions">
                            <button
                                className="btn btn--danger"
                                disabled={actingId === r.id}
                                onClick={() => handleUphold(r)}
                            >
                                {actingId === r.id ? '…' : 'Uphold'}
                            </button>
                            <button
                                className="btn btn--ghost"
                                disabled={actingId === r.id}
                                onClick={() => handleDismiss(r)}
                            >
                                {actingId === r.id ? '…' : 'Dismiss'}
                            </button>
                        </div>
                    ) : null}
                </article>
            ))}
        </div>
    );
}
