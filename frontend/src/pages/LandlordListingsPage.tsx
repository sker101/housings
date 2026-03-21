import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { selectRows, updateRows } from '../lib/supabase';
import PaymentModal from '../components/PaymentModal';

export default function LandlordListingsPage() {
    const { user, token } = useAuth();
    const { t } = useTranslation();

    const [listings, setListings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [actingId, setActingId] = useState<string | null>(null);

    // Payment Modal State
    const [boostModalOpen, setBoostModalOpen] = useState(false);
    const [boostingListingId, setBoostingListingId] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        async function load() {
            if (!user?.userId || !token) return;
            setLoading(true);
            try {
                // Fetch listings
                const listingRows = await selectRows('listings', {
                    select: 'id,title,room_type,price_monthly,status,vacancy_status,view_count,featured',
                    filters: [{ column: 'lister_id', op: 'eq', value: user.userId }],
                    order: 'created_at.desc',
                    limit: 1000,
                    accessToken: token
                });

                if (!mounted) return;

                if (listingRows.length === 0) {
                    setListings([]);
                    return;
                }

                const listingIds = listingRows.map(r => r.id);

                // Fetch saves
                const savedRows = await selectRows('saved_listings', {
                    select: 'listing_id',
                    filters: [{ column: 'listing_id', op: 'in', value: `(${listingIds.join(',')})` }],
                    limit: 5000,
                    accessToken: token
                });

                // Fetch bookings
                const bookingRows = await selectRows('bookings', {
                    select: 'id,listing_id',
                    filters: [{ column: 'listing_id', op: 'in', value: `(${listingIds.join(',')})` }],
                    limit: 5000,
                    accessToken: token
                });

                // Aggregate stats
                const savesByListing = savedRows.reduce((acc: any, r: any) => {
                    acc[r.listing_id] = (acc[r.listing_id] || 0) + 1;
                    return acc;
                }, {});

                const bookingsByListing = bookingRows.reduce((acc: any, r: any) => {
                    acc[r.listing_id] = (acc[r.listing_id] || 0) + 1;
                    return acc;
                }, {});

                const enriched = listingRows.map(l => ({
                    ...l,
                    saveCount: savesByListing[l.id] || 0,
                    bookingCount: bookingsByListing[l.id] || 0
                }));

                setListings(enriched);
            } catch (err: any) {
                if (mounted) setError(err.message);
            } finally {
                if (mounted) setLoading(false);
            }
        }
        load();
        return () => { mounted = false; };
    }, [user?.userId, token]);

    const toggleVacancy = async (listingId: string, currentStatus: string) => {
        const nextStatus = currentStatus === 'vacant' ? 'occupied' : 'vacant';
        setActingId(listingId);
        try {
            await updateRows('listings', { vacancy_status: nextStatus }, {
                filters: [{ column: 'id', op: 'eq', value: listingId }],
                accessToken: token
            });
            setListings(prev => prev.map(l => l.id === listingId ? { ...l, vacancy_status: nextStatus } : l));
        } catch (err: any) {
            console.error('Failed to update vacancy status', err);
        } finally {
            setActingId(null);
        }
    };

    const handleBoostClick = (listingId: string) => {
        setBoostingListingId(listingId);
        setBoostModalOpen(true);
    };

    const handleBoostSuccess = async () => {
        if (!boostingListingId) return;
        try {
            await updateRows('listings', { featured: true }, {
                filters: [{ column: 'id', op: 'eq', value: boostingListingId }],
                accessToken: token
            });
            setListings(prev => prev.map(l => l.id === boostingListingId ? { ...l, featured: true } : l));
        } catch (err) {
            console.error('Failed to boost listing', err);
        }
    };

    const filtered = listings.filter(l => l.title.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="container section">
            <div className="section__header">
                <div>
                    <h1>My Listings ({listings.length})</h1>
                    <p>Manage all your properties, track views, and change availability.</p>
                </div>
                <Link className="btn" to="/list-property">Add listing</Link>
            </div>

            {error && <p className="error-text">{error}</p>}

            <div className="card">
                <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <input
                        type="search"
                        placeholder="Search by title..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{ flex: 1, maxWidth: '400px', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid var(--border)' }}
                    />
                </div>

                {loading ? <p className="muted">Loading listings...</p> : null}

                {!loading && filtered.length === 0 ? (
                    <p className="muted">No listings found.</p>
                ) : (
                    <div className="table-wrap">
                        <table style={{ minWidth: '800px' }}>
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Type</th>
                                    <th>Price</th>
                                    <th>Status</th>
                                    <th>Vacancy</th>
                                    <th>Views</th>
                                    <th>Saves</th>
                                    <th>Bookings</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(l => (
                                    <tr key={l.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Link to={`/rooms/${l.id}`} style={{ fontWeight: 600, color: 'var(--jade)' }}>{l.title}</Link>
                                                {l.featured && <span style={{ fontSize: '0.7rem', background: '#fef3c7', color: '#d97706', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>⚡ Boosted</span>}
                                            </div>
                                        </td>
                                        <td>{String(t(`rooms.type.${l.room_type}`, l.room_type))}</td>
                                        <td>{new Intl.NumberFormat('en-TZ').format(l.price_monthly)} TZS</td>
                                        <td>
                                            <span style={{
                                                fontSize: '0.8rem',
                                                padding: '2px 8px',
                                                borderRadius: '12px',
                                                background: l.status === 'approved' ? '#ecfdf5' : '#f8faf9',
                                                color: l.status === 'approved' ? '#059669' : '#6b7280',
                                                fontWeight: 600
                                            }}>{l.status.toUpperCase()}</span>
                                        </td>
                                        <td>
                                            <span style={{
                                                fontSize: '0.8rem',
                                                padding: '2px 8px',
                                                borderRadius: '12px',
                                                background: l.vacancy_status === 'vacant' ? '#eff6ff' : '#fef2f2',
                                                color: l.vacancy_status === 'vacant' ? '#2563eb' : '#dc2626',
                                                fontWeight: 600
                                            }}>{l.vacancy_status.toUpperCase()}</span>
                                        </td>
                                        <td>{l.view_count || 0}</td>
                                        <td>{l.saveCount}</td>
                                        <td>{l.bookingCount}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button
                                                    className="btn btn--small btn--ghost"
                                                    onClick={() => toggleVacancy(l.id, l.vacancy_status)}
                                                    disabled={actingId === l.id}
                                                >
                                                    Toggle Vacancy
                                                </button>
                                                <Link to={`/list-property?edit=${l.id}`} className="btn btn--small btn--ghost">Edit</Link>
                                                <button
                                                    className="btn btn--small"
                                                    style={{ background: l.featured ? '#f3f4f6' : '#f59e0b', color: l.featured ? '#9ca3af' : 'white', borderColor: 'transparent' }}
                                                    disabled={l.featured}
                                                    onClick={() => handleBoostClick(l.id)}
                                                >
                                                    {l.featured ? 'Boosted' : 'Boost ⚡'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <PaymentModal
                isOpen={boostModalOpen}
                amount={5000}
                description="Featured listing boost - maximize your visibility!"
                onClose={() => { setBoostModalOpen(false); setBoostingListingId(null); }}
                onSuccess={handleBoostSuccess}
            />
        </div>
    );
}
