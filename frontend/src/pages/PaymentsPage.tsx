import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { selectRows, updateRows } from '../lib/supabase';

function formatDate(value) {
    if (!value) return '—';
    try { return new Date(value).toLocaleDateString(); } catch { return value; }
}

function formatMoney(value) {
    return `${new Intl.NumberFormat('en-TZ').format(Number(value || 0))} TZS`;
}

function statusChip(status: string) {
    const colors = {
        pending: '#c47900',
        paid: '#1a7f37',
        late: '#cf222e'
    };
    return (
        <span style={{
            display: 'inline-block',
            padding: '2px 10px',
            borderRadius: '12px',
            background: colors[status] ? `${colors[status]}22` : '#eee',
            color: colors[status] || '#666',
            fontWeight: 600,
            fontSize: '0.8rem',
            textTransform: 'capitalize'
        }}>
            {status}
        </span>
    );
}

export default function PaymentsPage() {
    const { user, token } = useAuth();
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [markingId, setMarkingId] = useState<string | null>(null);

    async function loadPayments() {
        if (!user?.userId || !token) { setLoading(false); return; }
        setLoading(true);
        setError('');
        try {
            // Fetch lister's bookings
            const bookings = await selectRows('bookings', {
                select: 'id,listing_id,tenant_id,move_in_date,duration_months,status',
                filters: [{ column: 'lister_id', op: 'eq', value: user.userId }],
                order: 'created_at.desc',
                limit: 200,
                accessToken: token
            });

            if (bookings.length === 0) { setRecords([]); setLoading(false); return; }

            // Fetch payment records for those bookings
            const bookingIds = bookings.map((b) => b.id);
            const payments = await selectRows('payment_records', {
                select: 'id,booking_id,amount,due_date,status,paid_at',
                filters: [{ column: 'booking_id', op: 'in', value: `(${bookingIds.join(',')})` }],
                order: 'due_date.asc',
                accessToken: token
            });

            // Merge info
            const bookingMap = new Map(bookings.map((b) => [b.id, b]));

            // Fetch listing titles
            const listingIds = Array.from(new Set(bookings.map((b) => b.listing_id)));
            const listings = await selectRows('listings', {
                select: 'id,title',
                filters: [{ column: 'id', op: 'in', value: `(${listingIds.join(',')})` }],
                accessToken: token
            });
            const listingMap = new Map(listings.map((l) => [l.id, l]));

            // Fetch tenant names
            const tenantIds = Array.from(new Set(bookings.map((b) => b.tenant_id)));
            const tenants = await selectRows('profiles', {
                select: 'id,full_name',
                filters: [{ column: 'id', op: 'in', value: `(${tenantIds.join(',')})` }],
                accessToken: token
            });
            const tenantMap = new Map(tenants.map((t) => [t.id, t]));

            const enriched = payments.map((p) => {
                const booking = bookingMap.get((p as any).booking_id) as any;
                return {
                    ...p,
                    listing: booking ? listingMap.get(booking.listing_id) : null,
                    tenant: booking ? tenantMap.get(booking.tenant_id) : null,
                    booking
                };
            });

            setRecords(enriched);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadPayments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.userId, token]);

    const markReceived = async (paymentId: string) => {
        setMarkingId(paymentId);
        setError('');
        try {
            await updateRows(
                'payment_records',
                { status: 'paid', paid_at: new Date().toISOString() },
                { filters: [{ column: 'id', op: 'eq', value: paymentId }], accessToken: token }
            );
            setRecords((prev) =>
                prev.map((r) =>
                    r.id === paymentId ? { ...r, status: 'paid', paid_at: new Date().toISOString() } : r
                )
            );
        } catch (err: any) {
            setError(err.message);
        } finally {
            setMarkingId(null);
        }
    };

    const totalOutstanding = records
        .filter((r) => r.status === 'pending' || r.status === 'late')
        .reduce((sum, r) => sum + Number(r.amount || 0), 0);

    const totalReceived = records
        .filter((r) => r.status === 'paid')
        .reduce((sum, r) => sum + Number(r.amount || 0), 0);

    return (
        <div className="container section">
            <div className="section__header">
                <div>
                    <h1>Payment Records</h1>
                    <p>Track rent payments across all your active bookings.</p>
                </div>
                <Link to="/landlord" className="btn btn--ghost btn--small">← Dashboard</Link>
            </div>

            {loading ? <p className="muted">Loading payments…</p> : null}
            {error ? <p className="error-text">{error}</p> : null}

            <section className="metric-grid" style={{ marginBottom: '1.5rem' }}>
                <article className="metric-card">
                    <p>Outstanding</p>
                    <strong style={{ color: 'var(--danger, #cf222e)' }}>{formatMoney(totalOutstanding)}</strong>
                    <span className="muted">Pending + Late</span>
                </article>
                <article className="metric-card">
                    <p>Received</p>
                    <strong style={{ color: 'var(--success, #1a7f37)' }}>{formatMoney(totalReceived)}</strong>
                    <span className="muted">All time</span>
                </article>
            </section>

            {!loading && records.length === 0 ? (
                <section className="card">
                    <p className="muted">No payment records yet. Payment records are generated automatically when you approve a booking.</p>
                </section>
            ) : null}

            {records.length > 0 ? (
                <section className="card">
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                                    <th style={{ padding: '0.6rem 0.75rem' }}>Tenant</th>
                                    <th style={{ padding: '0.6rem 0.75rem' }}>Listing</th>
                                    <th style={{ padding: '0.6rem 0.75rem' }}>Amount</th>
                                    <th style={{ padding: '0.6rem 0.75rem' }}>Due Date</th>
                                    <th style={{ padding: '0.6rem 0.75rem' }}>Status</th>
                                    <th style={{ padding: '0.6rem 0.75rem' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map((r) => (
                                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '0.6rem 0.75rem' }}>{r.tenant?.full_name || '—'}</td>
                                        <td style={{ padding: '0.6rem 0.75rem' }}>{r.listing?.title || '—'}</td>
                                        <td style={{ padding: '0.6rem 0.75rem' }}>{formatMoney(r.amount)}</td>
                                        <td style={{ padding: '0.6rem 0.75rem' }}>{formatDate(r.due_date)}</td>
                                        <td style={{ padding: '0.6rem 0.75rem' }}>{statusChip(r.status)}</td>
                                        <td style={{ padding: '0.6rem 0.75rem' }}>
                                            {r.status !== 'paid' ? (
                                                <button
                                                    className="btn btn--small"
                                                    disabled={markingId === r.id}
                                                    onClick={() => markReceived(r.id)}
                                                >
                                                    {markingId === r.id ? 'Saving…' : 'Mark Received'}
                                                </button>
                                            ) : (
                                                <span className="muted" style={{ fontSize: '0.8rem' }}>Received {formatDate(r.paid_at)}</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            ) : null}
        </div>
    );
}
