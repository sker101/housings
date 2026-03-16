import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { selectRows } from '../lib/supabase';
import { APP_ROLE } from '../lib/roles';

export default function ReviewsPage() {
    const { user, token } = useAuth();
    const { t } = useTranslation();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [reviews, setReviews] = useState<any[]>([]);
    const [profiles, setProfiles] = useState<Record<string, any>>({});
    const [listings, setListings] = useState<Record<string, any>>({});

    useEffect(() => {
        let mounted = true;
        async function loadData() {
            if (!user?.userId || !token) return;
            try {
                setLoading(true);

                let reviewRows: any[] = [];

                if (user.role === APP_ROLE.LISTER) {
                    // Fetch reviews ON properties owned by this landlord
                    const myListingRows = await selectRows('listings', {
                        select: 'id,title', filters: [{ column: 'lister_id', op: 'eq', value: user.userId }],
                        limit: 500, accessToken: token
                    });
                    const ids = myListingRows.map((r: any) => r.id);
                    const listingMap: Record<string, any> = {};
                    myListingRows.forEach((r: any) => listingMap[r.id] = r);
                    setListings(listingMap);

                    if (ids.length > 0) {
                        reviewRows = await selectRows('reviews', {
                            select: 'id,tenant_id,listing_id,rating,comment,created_at',
                            filters: [{ column: 'listing_id', op: 'in', value: `(${ids.join(',')})` }],
                            order: 'created_at.desc',
                            limit: 100, accessToken: token
                        });
                    }
                } else {
                    // Fetch reviews WRITTEN by this student
                    reviewRows = await selectRows('reviews', {
                        select: 'id,tenant_id,listing_id,rating,comment,created_at',
                        filters: [{ column: 'tenant_id', op: 'eq', value: user.userId }],
                        order: 'created_at.desc',
                        limit: 50, accessToken: token
                    });
                }

                if (!mounted) return;

                // Fetch users who wrote the reviews (relevant for landlord)
                if (reviewRows.length > 0 && user.role === APP_ROLE.LISTER) {
                    const uIds = Array.from(new Set(reviewRows.map(r => r.tenant_id)));
                    const userRows = await selectRows('profiles', {
                        select: 'id,full_name', filters: [{ column: 'id', op: 'in', value: `(${uIds.join(',')})` }],
                        limit: 200, accessToken: token
                    });
                    const cmap: Record<string, any> = {};
                    userRows.forEach((u: any) => cmap[u.id] = u);
                    setProfiles(cmap);
                }

                // Fetch listings if student (to know what property they reviewed)
                if (reviewRows.length > 0 && user.role === APP_ROLE.STUDENT) {
                    const listIds = Array.from(new Set(reviewRows.map(r => r.listing_id)));
                    const rListings = await selectRows('listings', {
                        select: 'id,title', filters: [{ column: 'id', op: 'in', value: `(${listIds.join(',')})` }],
                        limit: 100, accessToken: token
                    });
                    const lmap: Record<string, any> = {};
                    rListings.forEach((l: any) => lmap[l.id] = l);
                    setListings(lmap);
                }

                setReviews(reviewRows);

            } catch (err: any) {
                if (mounted) setError(err.message);
            } finally {
                if (mounted) setLoading(false);
            }
        }
        loadData();
        return () => { mounted = false; };
    }, [user?.userId, token, user?.role]);

    if (loading) return <div className="container section"><p>Loading reviews...</p></div>;
    if (error) return <div className="container section"><p className="error-text">{error}</p></div>;

    const totalReviews = reviews.length;
    const avgRating = totalReviews > 0 ? (reviews.reduce((acc, r) => acc + Number(r.rating), 0) / totalReviews).toFixed(1) : 0;

    return (
        <div className="container section">
            <div className="section__header">
                <div>
                    <h1>{user?.role === APP_ROLE.LISTER ? t('reviews.tenantReviews') : t('reviews.myReviews')}</h1>
                    <p>
                        {user?.role === APP_ROLE.LISTER
                            ? t('reviews.landlordSubtitle')
                            : t('reviews.studentSubtitle')}
                    </p>
                </div>
            </div>

            {user?.role === APP_ROLE.LISTER && totalReviews > 0 ? (
                <div className="card" style={{ display: 'inline-flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                    <div style={{ padding: '0.5rem', background: '#eef2ff', borderRadius: '50%' }}>
                        <Star size={32} color="#4f46e5" fill="#4f46e5" />
                    </div>
                    <div>
                        <p style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600, color: 'var(--muted)' }}>{t('reviews.avgRating')}</p>
                        <p style={{ fontSize: '1.8rem', fontWeight: 800 }}>{avgRating} <span style={{ fontSize: '1rem', color: 'var(--muted)', fontWeight: 500 }}>/ 5.0</span></p>
                    </div>
                    <div style={{ marginLeft: '1rem', borderLeft: '1px solid var(--border)', paddingLeft: '1.5rem' }}>
                        <p style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600, color: 'var(--muted)' }}>{t('reviews.totalReviews')}</p>
                        <p style={{ fontSize: '1.8rem', fontWeight: 800 }}>{totalReviews}</p>
                    </div>
                </div>
            ) : null}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {reviews.length === 0 ? (
                    <p className="muted">{t('reviews.noReviews')}</p>
                ) : (
                    reviews.map(r => {
                        const reviewerName = profiles[r.tenant_id]?.full_name || t('reviews.anonymousTenant');
                        const listingTitle = listings[r.listing_id]?.title || t('reviews.unknownProperty');
                        return (
                            <div key={r.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <p style={{ fontWeight: 700, fontSize: '1rem' }}>
                                        {user?.role === APP_ROLE.LISTER ? reviewerName : `${t('reviews.reviewFor')}: ${listingTitle}`}
                                    </p>
                                    <p style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
                                        {new Date(r.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                {user?.role === APP_ROLE.LISTER ? (
                                    <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{t('reviews.property')}: {listingTitle}</p>
                                ) : null}

                                <div style={{ display: 'flex', gap: '0.2rem', marginTop: '0.2rem' }}>
                                    {[1, 2, 3, 4, 5].map((s) => (
                                        <Star key={s} size={16} fill={s <= r.rating ? "#f59e0b" : "transparent"} color={s <= r.rating ? "#f59e0b" : "#d1d5db"} />
                                    ))}
                                </div>
                                {r.comment ? (
                                    <p style={{ marginTop: '0.5rem', lineHeight: 1.5, background: 'var(--surface)', padding: '0.75rem', borderRadius: 8, fontStyle: 'italic', border: '1px solid var(--border)' }}>
                                        &ldquo;{r.comment}&rdquo;
                                    </p>
                                ) : (
                                    <p className="muted" style={{ fontStyle: 'italic', fontSize: '0.85rem' }}>{t('reviews.ratingOnly')}</p>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
