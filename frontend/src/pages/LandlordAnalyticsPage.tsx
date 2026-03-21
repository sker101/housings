import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, CartesianGrid
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { selectRows } from '../lib/supabase';

const COLORS = ['#1a5c3a', '#c8920a', '#06b6d4', '#8b5cf6', '#ec4899'];

export default function LandlordAnalyticsPage() {
    const { user, token } = useAuth();
    const { t } = useTranslation();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        let mounted = true;
        async function loadData() {
            if (!user?.userId || !token) return;
            try {
                setLoading(true);
                // 1. Fetch all listings for this landlord
                const listingRows = await selectRows('listings', {
                    select: 'id,title,view_count',
                    filters: [{ column: 'lister_id', op: 'eq', value: user.userId }],
                    limit: 100,
                    accessToken: token
                });

                const listingIds = listingRows.map(l => l.id).filter(Boolean);

                // 2. Fetch bookings
                let bookingRows: any[] = [];
                let saveRows: any[] = [];

                if (listingIds.length > 0) {
                    const [bRows, sRows] = await Promise.all([
                        selectRows('bookings', {
                            select: 'id,listing_id,status',
                            filters: [{ column: 'listing_id', op: 'in', value: `(${listingIds.join(',')})` }],
                            limit: 500,
                            accessToken: token
                        }),
                        selectRows('saved_listings', {
                            select: 'listing_id',
                            filters: [{ column: 'listing_id', op: 'in', value: `(${listingIds.join(',')})` }],
                            limit: 500,
                            accessToken: token
                        })
                    ]);
                    bookingRows = bRows;
                    saveRows = sRows;
                }

                if (!mounted) return;

                // Process data for charts
                // A. View counts per property (Top 7)
                const viewsData = [...listingRows]
                    .sort((a, b) => (Number(b.view_count) || 0) - (Number(a.view_count) || 0))
                    .slice(0, 7)
                    .map(l => ({
                        name: l.title.length > 20 ? l.title.substring(0, 20) + '...' : l.title,
                        views: Number(l.view_count) || 0
                    }));

                // B. Saves per property
                const savesMap: Record<string, number> = {};
                saveRows.forEach(s => {
                    savesMap[s.listing_id] = (savesMap[s.listing_id] || 0) + 1;
                });
                const savesData = [...listingRows]
                    .map(l => ({
                        name: l.title.length > 20 ? l.title.substring(0, 20) + '...' : l.title,
                        saves: savesMap[l.id] || 0
                    }))
                    .filter(d => d.saves > 0)
                    .sort((a, b) => b.saves - a.saves)
                    .slice(0, 7);

                // C. Booking conversion
                const reqs = bookingRows.filter(b => b.status === 'requested').length;
                const apps = bookingRows.filter(b => b.status === 'approved').length;
                const decs = bookingRows.filter(b => b.status === 'declined').length;
                const bookingStatusData = [
                    { name: 'Approved', value: apps },
                    { name: 'Pending', value: reqs },
                    { name: 'Declined', value: decs },
                ].filter(d => d.value > 0);

                // D. Totals
                const totalViews = listingRows.reduce((sum, r) => sum + (Number(r.view_count) || 0), 0);
                const totalSaves = saveRows.length;
                // E. Table Data
                const tableData = listingRows.map(l => {
                    const views = Number(l.view_count) || 0;
                    const saves = savesMap[l.id] || 0;
                    const bookings = bookingRows.filter(b => b.listing_id === l.id).length;
                    const conversionRate = views > 0 ? ((bookings / views) * 100).toFixed(1) : '0.0';
                    return { id: l.id, title: l.title, views, saves, bookings, conversionRate };
                });

                setStats({
                    totalViews, totalSaves,
                    viewsData, savesData, bookingStatusData, tableData
                });

            } catch (err: any) {
                if (mounted) setError(err.message);
            } finally {
                if (mounted) setLoading(false);
            }
        }
        loadData();
        return () => { mounted = false; };
    }, [user?.userId, token]);

    if (loading) return <div className="container section"><p>{t('dashboard.loadingDashboard', 'Loading analytics...')}</p></div>;
    if (error) return <div className="container section"><p className="error-text">{error}</p></div>;
    if (!stats) return null;

    return (
        <div className="container section">
            <div className="section__header">
                <div>
                    <h1>Performance Analytics</h1>
                    <p>Track your property views, saves, and booking conversions over time.</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div className="card" style={{ borderLeft: '4px solid #1a5c3a' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Property Views</p>
                    <p style={{ fontSize: '2.5rem', fontWeight: 800 }}>{stats.totalViews}</p>
                </div>
                <div className="card" style={{ borderLeft: '4px solid #c8920a' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Favorites/Saves</p>
                    <p style={{ fontSize: '2.5rem', fontWeight: 800 }}>{stats.totalSaves}</p>
                </div>
                <div className="card" style={{ borderLeft: '4px solid #06b6d4' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Bookings Created</p>
                    <p style={{ fontSize: '2.5rem', fontWeight: 800 }}>
                        {stats.bookingStatusData.reduce((sum, item) => sum + item.value, 0)}
                    </p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>

                {/* Chart 1: Top Views */}
                <section className="card">
                    <h2 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Top Properties by Views</h2>
                    <div style={{ height: 300 }}>
                        {stats.viewsData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.viewsData} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" />
                                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
                                    <Tooltip cursor={{ fill: '#f1f5f9' }} />
                                    <Bar dataKey="views" fill="#1a5c3a" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <p className="muted">No view data available yet.</p>}
                    </div>
                </section>

                {/* Chart 2: Top Saves */}
                <section className="card">
                    <h2 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Most Favorited Properties</h2>
                    <div style={{ height: 300 }}>
                        {stats.savesData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.savesData} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" />
                                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
                                    <Tooltip cursor={{ fill: '#f1f5f9' }} />
                                    <Bar dataKey="saves" fill="#c8920a" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <p className="muted">No save data available yet.</p>}
                    </div>
                </section>

                {/* Chart 3: Booking Conversion */}
                <section className="card">
                    <h2 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Booking Request Outcomes</h2>
                    <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {stats.bookingStatusData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.bookingStatusData}
                                        cx="50%" cy="50%"
                                        innerRadius={60} outerRadius={90}
                                        paddingAngle={5} dataKey="value"
                                    >
                                        {stats.bookingStatusData.map((_, i) => (
                                            <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : <p className="muted">No bookings available yet.</p>}
                    </div>
                </section>

            </div>

            <section className="card" style={{ marginTop: '2rem' }}>
                <h2>Per-Listing Performance</h2>
                {stats.tableData && stats.tableData.length > 0 ? (
                    <div className="table-wrap">
                        <table style={{ minWidth: '700px' }}>
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Views</th>
                                    <th>Saves</th>
                                    <th>Bookings</th>
                                    <th>Conversion Rate</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.tableData.map((row: any) => (
                                    <tr key={row.id}>
                                        <td style={{ fontWeight: 600 }}>{row.title}</td>
                                        <td>{row.views}</td>
                                        <td>{row.saves}</td>
                                        <td>{row.bookings}</td>
                                        <td>
                                            <span style={{
                                                background: Number(row.conversionRate) > 0 ? '#ecfdf5' : '#f8faf9',
                                                color: Number(row.conversionRate) > 0 ? '#059669' : '#6b7280',
                                                padding: '2px 8px', borderRadius: '12px', fontWeight: 600, fontSize: '0.85rem'
                                            }}>
                                                {row.conversionRate}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="muted">No detailed performance data available yet.</p>
                )}
            </section>
        </div>
    );
}
