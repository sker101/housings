import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, MapPin, Clock, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { selectRows } from '../lib/supabase';
import { APP_ROLE } from '../lib/roles';
import { Link } from 'react-router-dom';

export default function BookingsPage() {
    const { user, token } = useAuth();
    const { t } = useTranslation();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [bookings, setBookings] = useState<any[]>([]);
    const [listings, setListings] = useState<Record<string, any>>({});
    const [profiles, setProfiles] = useState<Record<string, any>>({});

    useEffect(() => {
        let mounted = true;
        async function loadData() {
            if (!user?.userId || !token) return;
            try {
                setLoading(true);

                const column = user.role === APP_ROLE.LISTER ? 'lister_id' : 'tenant_id';
                const rows = await selectRows('bookings', {
                    select: 'id,listing_id,tenant_id,lister_id,move_in_date,duration_months,status,created_at',
                    filters: [{ column, op: 'eq', value: user.userId }],
                    order: 'created_at.desc',
                    limit: 100,
                    accessToken: token
                });

                if (!mounted) return;

                const listingIds = Array.from(new Set(rows.map(r => r.listing_id)));
                const profileIds = Array.from(new Set(rows.map(r => user.role === APP_ROLE.LISTER ? r.tenant_id : r.lister_id)));

                const [listingRows, profileRows] = await Promise.all([
                    listingIds.length > 0 ? selectRows('listings', {
                        select: 'id,title,region,district,ward',
                        filters: [{ column: 'id', op: 'in', value: `(${listingIds.join(',')})` }],
                        accessToken: token
                    }) : Promise.resolve([]),
                    profileIds.length > 0 ? selectRows('profiles', {
                        select: 'id,full_name,phone',
                        filters: [{ column: 'id', op: 'in', value: `(${profileIds.join(',')})` }],
                        accessToken: token
                    }) : Promise.resolve([])
                ]);

                const lmap: Record<string, any> = {};
                listingRows.forEach(l => lmap[l.id] = l);

                const pmap: Record<string, any> = {};
                profileRows.forEach(p => pmap[p.id] = p);

                setBookings(rows);
                setListings(lmap);
                setProfiles(pmap);

            } catch (err: any) {
                if (mounted) setError(err.message);
            } finally {
                if (mounted) setLoading(false);
            }
        }
        loadData();
        return () => { mounted = false; };
    }, [user?.userId, token, user?.role]);

    if (loading) return <div className="container section"><p>{t('common.loading')}</p></div>;
    if (error) return <div className="container section"><p className="error-text">{error}</p></div>;

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'approved': return { background: '#ecfdf5', color: '#059669', border: '1px solid #10b98133' };
            case 'requested': return { background: '#fefce8', color: '#ca8a04', border: '1px solid #eab30833' };
            case 'rejected': return { background: '#fef2f2', color: '#dc2626', border: '1px solid #ef444433' };
            case 'cancelled': return { background: '#f9fafb', color: '#6b7280', border: '1px solid #d1d5db33' };
            default: return { background: '#f9fafb', color: '#374151' };
        }
    };

    return (
        <div className="container section">
            <div className="section__header">
                <div>
                    <h1>{t('bookings.title')}</h1>
                    <p>{t('bookings.subtitle')}</p>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {bookings.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                        <Calendar size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
                        <p className="muted">{t('bookings.noBookings')}</p>
                        <Link to="/tenant/search" className="btn btn--ghost" style={{ marginTop: '1rem' }}>
                            {t('bookings.browseNow')}
                        </Link>
                    </div>
                ) : (
                    bookings.map(b => {
                        const listing = listings[b.listing_id];
                        const counterParty = profiles[user.role === APP_ROLE.LISTER ? b.tenant_id : b.lister_id];
                        const statusStyle = getStatusStyle(b.status);

                        return (
                            <div key={b.id} className="card" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1.5rem', alignItems: 'start' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <h3 style={{ fontSize: '1.1rem', marginBottom: 2 }}>{listing?.title || t('common.unknownListing')}</h3>

                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', color: 'var(--muted)', fontSize: '0.85rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <MapPin size={14} /> {listing ? `${listing.district}, ${listing.region}` : t('common.unknownLocation')}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <Clock size={14} /> {t('bookings.moveIn')}: {new Date(b.move_in_date).toLocaleDateString()} ({b.duration_months} {t('common.months')})
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)', fontSize: '0.9rem' }}>
                                        <p>
                                            <strong>{user.role === APP_ROLE.LISTER ? t('bookings.tenant') : t('bookings.landlord')}:</strong> {counterParty?.full_name || t('common.unknownUser')}
                                        </p>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem' }}>
                                    <span style={{
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '999px',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        ...statusStyle
                                    }}>
                                        {t(`bookings.status.${b.status}`)}
                                    </span>

                                    <Link to="/messages" className="btn btn--ghost btn--small" style={{ gap: '0.4rem' }}>
                                        <MessageSquare size={14} /> {t('bookings.message')}
                                    </Link>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
