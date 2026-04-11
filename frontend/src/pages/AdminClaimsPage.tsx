import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { selectRows, updateRows } from '../lib/supabase';

function formatDate(value) {
    if (!value) return '—';
    try { return new Date(value).toLocaleString(); } catch { return value; }
}

function statusChip(status: string) {
    const colors: Record<string, string> = {
        pending: '#c47900',
        upheld: '#cf222e',
        dismissed: '#57606a',
        disputed: '#1a7f37'
    };
    return (
        <span style={{
            display: 'inline-block',
            padding: '2px 10px',
            borderRadius: '12px',
            background: `${colors[status] || '#888'}22`,
            color: colors[status] || '#666',
            fontWeight: 600,
            fontSize: '0.8rem',
            textTransform: 'capitalize'
        }}>
            {status}
        </span>
    );
}

export default function AdminClaimsPage() {
    const { token } = useAuth();
    const [claims, setClaims] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState<'pending' | 'upheld' | 'dismissed'>('pending');
    const [actingId, setActingId] = useState<string | null>(null);

    async function loadClaims() {
        if (!token) { setLoading(false); return; }
        setLoading(true);
        setError('');
        try {
            const rows = await selectRows('campuscover_claims', {
                select: 'id,booking_id,tenant_id,listing_id,description,evidence_urls,status,admin_decision,credit_issued,submitted_at',
                filters: [{ column: 'status', op: 'eq', value: filter }],
                order: 'submitted_at.desc',
                limit: 200,
                accessToken: token
            });

            if (rows.length === 0) { setClaims([]); setLoading(false); return; }

            // Enrich
            const listingIds = Array.from(new Set(rows.map((r) => r.listing_id)));
            const tenantIds = Array.from(new Set(rows.map((r) => r.tenant_id)));

            const [listings, tenants] = await Promise.all([
                selectRows('listings', {
                    select: 'id,title', filters: [{ column: 'id', op: 'in', value: `(${listingIds.join(',')})` }], accessToken: token
                }),
                selectRows('profiles', {
                    select: 'id,full_name,phone', filters: [{ column: 'id', op: 'in', value: `(${tenantIds.join(',')})` }], accessToken: token
                })
            ]);

            const listingMap = new Map(listings.map((l) => [l.id, l]));
            const tenantMap = new Map(tenants.map((t) => [t.id, t]));

            setClaims(rows.map((r) => ({
                ...r,
                listing: listingMap.get(r.listing_id),
                tenant: tenantMap.get(r.tenant_id)
            })));
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadClaims();
         
    }, [token, filter]);

    const act = async (claimId: string, status: 'upheld' | 'dismissed', decision: string, credit: number = 0) => {
        setActingId(claimId);
        setError('');
        try {
            await updateRows(
                'campuscover_claims',
                { status, admin_decision: decision, credit_issued: credit },
                { filters: [{ column: 'id', op: 'eq', value: claimId }], accessToken: token }
            );
            await loadClaims();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setActingId(null);
        }
    };

    const handleUphold = async (claim: any) => {
        const decision = window.prompt(
            `Uphold CampusCover claim for "${claim.listing?.title || claim.listing_id}"?\n\nEnter your decision / resolution note:`
        );
        if (decision === null) return;

        const creditStr = window.prompt('Enter credit amount to issue (TZS, 0 if none):');
        if (creditStr === null) return;
        const credit = parseInt(creditStr) || 0;

        await act(claim.id, 'upheld', decision, credit);
    };

    const handleDismiss = async (claim: any) => {
        const decision = window.prompt(
            `Dismiss claim for "${claim.listing?.title || claim.listing_id}"?\n\nEnter your decision note:`
        );
        if (decision === null) return;
        await act(claim.id, 'dismissed', decision, 0);
    };

    return (
        <div className="container section">
            <div className="section__header">
                <div>
                    <h1>CampusCover Claims</h1>
                    <p>Tenant protection claims — review and resolve within 48 hours.</p>
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

            {loading ? <p className="muted">Loading claims…</p> : null}
            {!loading && claims.length === 0 ? <section className="card"><p className="muted">No {filter} claims.</p></section> : null}

            {claims.map((c) => (
                <article key={c.id} className="moderation-card" style={{ marginBottom: '1rem' }}>
                    <div>
                        <p><strong>Tenant:</strong> {c.tenant?.full_name || c.tenant_id}</p>
                        <p>
                            <strong>Listing:</strong>{' '}
                            <Link to={`/rooms/${c.listing_id}`} target="_blank" rel="noopener noreferrer">
                                {c.listing?.title || c.listing_id}
                            </Link>
                        </p>
                        <p style={{ margin: '0.5rem 0', fontSize: '0.9rem' }}>{c.description}</p>
                        <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                            Submitted: {formatDate(c.submitted_at)} {statusChip(c.status)}
                        </p>
                        {c.credit_issued > 0 ? (
                            <p style={{ fontSize: '0.85rem', color: '#1a7f37', marginTop: '0.25rem' }}>
                                Credit issued: {new Intl.NumberFormat('en-TZ').format(c.credit_issued)} TZS
                            </p>
                        ) : null}
                        {c.admin_decision ? (
                            <p style={{ marginTop: '0.5rem', padding: '0.4rem 0.75rem', background: '#f3f4f6', borderRadius: '6px', fontSize: '0.85rem' }}>
                                Decision: {c.admin_decision}
                            </p>
                        ) : null}
                    </div>

                    {filter === 'pending' ? (
                        <div className="moderation-card__actions">
                            <button
                                className="btn btn--danger"
                                disabled={actingId === c.id}
                                onClick={() => handleUphold(c)}
                            >
                                {actingId === c.id ? '…' : 'Uphold Claim'}
                            </button>
                            <button
                                className="btn btn--ghost"
                                disabled={actingId === c.id}
                                onClick={() => handleDismiss(c)}
                            >
                                {actingId === c.id ? '…' : 'Dismiss'}
                            </button>
                        </div>
                    ) : null}
                </article>
            ))}
        </div>
    );
}
