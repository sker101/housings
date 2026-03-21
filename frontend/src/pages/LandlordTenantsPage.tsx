import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { selectRows } from '../lib/supabase';
import { Phone, MessageSquare, Calendar, Building2 } from 'lucide-react';

export default function LandlordTenantsPage() {
    const { user, token } = useAuth();
    const { t } = useTranslation();

    const [tenants, setTenants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let mounted = true;
        async function load() {
            if (!user?.userId || !token) return;
            setLoading(true);
            try {
                // Fetch approved bookings
                const bookingRows = await selectRows('bookings', {
                    select: 'id,tenant_id,listing_id,move_in_date,duration_months,contact_preference,message',
                    filters: [
                        { column: 'lister_id', op: 'eq', value: user.userId },
                        { column: 'status', op: 'eq', value: 'approved' }
                    ],
                    order: 'move_in_date.desc',
                    accessToken: token
                });

                if (!mounted) return;

                if (bookingRows.length === 0) {
                    setTenants([]);
                    return;
                }

                const tenantIds = Array.from(new Set(bookingRows.map(b => b.tenant_id)));
                const listingIds = Array.from(new Set(bookingRows.map(b => b.listing_id)));

                const [profileRows, listingRows] = await Promise.all([
                    selectRows('profiles', {
                        select: 'id,full_name,phone',
                        filters: [{ column: 'id', op: 'in', value: `(${tenantIds.join(',')})` }],
                        accessToken: token
                    }),
                    selectRows('listings', {
                        select: 'id,title,room_type,price_monthly',
                        filters: [{ column: 'id', op: 'in', value: `(${listingIds.join(',')})` }],
                        accessToken: token
                    })
                ]);

                const profileMap = new Map(profileRows.map(p => [p.id, p]));
                const listingMap = new Map(listingRows.map(l => [l.id, l]));

                const enriched = bookingRows.map(b => ({
                    ...b,
                    profile: profileMap.get(b.tenant_id),
                    listing: listingMap.get(b.listing_id)
                }));

                setTenants(enriched);
            } catch (err: any) {
                if (mounted) setError(err.message);
            } finally {
                if (mounted) setLoading(false);
            }
        }
        load();
        return () => { mounted = false; };
    }, [user?.userId, token]);

    return (
        <div className="container section">
            <div className="section__header">
                <div>
                    <h1>My Tenants</h1>
                    <p>Manage and contact your approved tenants.</p>
                </div>
            </div>

            {error && <p className="error-text">{error}</p>}
            {loading && <p className="muted">Loading tenants...</p>}

            {!loading && tenants.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <p className="muted">You have no approved tenants yet.</p>
                </div>
            ) : null}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {tenants.map(t => (
                    <div key={t.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                            <div style={{
                                width: 44, height: 44, borderRadius: '50%', background: 'var(--jade-light)', color: 'var(--jade)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem'
                            }}>
                                {(t.profile?.full_name || 'U')[0].toUpperCase()}
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{t.profile?.full_name || 'Unknown User'}</h3>
                                <p className="muted" style={{ fontSize: '0.85rem' }}>ID: {t.tenant_id.substring(0, 8)}</p>
                            </div>
                        </div>

                        <div style={{ fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Building2 size={16} className="muted" />
                                <strong>Listing:</strong> {t.listing?.title || 'Unknown Listing'}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Calendar size={16} className="muted" />
                                <strong>Move-in:</strong> {new Date(t.move_in_date).toLocaleDateString()}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ width: 16, display: 'inline-block', textAlign: 'center', color: 'var(--muted)' }}>⏳</span>
                                <strong>Duration:</strong> {t.duration_months} month{t.duration_months !== 1 ? 's' : ''}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ width: 16, display: 'inline-block', textAlign: 'center', color: 'var(--muted)' }}>💰</span>
                                <strong>Rent:</strong> {new Intl.NumberFormat('en-TZ').format(t.listing?.price_monthly || 0)} TZS/mo
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Phone size={16} className="muted" />
                                <strong>Preference:</strong> <span style={{ textTransform: 'capitalize' }}>{t.contact_preference || 'None'}</span>
                            </div>
                        </div>

                        <div style={{ marginTop: 'auto', paddingTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                            <Link to="/messages" className="btn btn--small" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                <MessageSquare size={16} /> Message
                            </Link>
                            {t.profile?.phone && (
                                <a href={`tel:${t.profile.phone}`} className="btn btn--small btn--ghost" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                    <Phone size={16} /> Call
                                </a>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
