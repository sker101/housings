import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { selectRows, updateRows } from '../lib/supabase';

const TYPE_ICONS: Record<string, string> = {
    booking_requested: '📋',
    booking_approved: '🎉',
    booking_declined: '❌',
    listing_approved: '✅',
    listing_rejected: '🚫',
    listing_flagged: '⚠️',
    message: '💬',
    system: '🔔'
};

function formatRelativeTime(value: string): string {
    if (!value) return '';
    const diff = Date.now() - new Date(value).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationsPage() {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    async function loadNotifications() {
        if (!user?.userId || !token) { setLoading(false); return; }
        setLoading(true);
        setError('');
        try {
            const rows = await selectRows('notifications', {
                select: 'id,type,title,body,link,read_at,created_at',
                filters: [{ column: 'user_id', op: 'eq', value: user.userId }],
                order: 'created_at.desc',
                limit: 100,
                accessToken: token
            }) as any[];
            setNotifications(rows);

            // Mark all unread ones as read
            const unreadIds = rows.filter((n) => !n.read_at).map((n) => n.id);
            if (unreadIds.length > 0) {
                // Batch mark as read (one per unread — acceptable for small counts)
                await Promise.all(unreadIds.map((id) =>
                    updateRows(
                        'notifications',
                        { read_at: new Date().toISOString() },
                        { filters: [{ column: 'id', op: 'eq', value: id }], accessToken: token }
                    ).catch(() => null) // non-critical, suppress errors
                ));
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadNotifications();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.userId, token]);

    const handleClick = (n: any) => {
        if (n.link) navigate(n.link);
    };

    return (
        <div className="container section">
            <div className="section__header">
                <div>
                    <h1>🔔 Notifications</h1>
                    <p>Updates about your bookings, listings, and messages.</p>
                </div>
                <Link to={-1 as any} className="btn btn--ghost btn--small">← Back</Link>
            </div>

            {loading ? <p className="muted">Loading…</p> : null}
            {error ? <p className="error-text">{error}</p> : null}

            {!loading && notifications.length === 0 ? (
                <section className="card">
                    <p className="muted" style={{ textAlign: 'center', padding: '2rem' }}>
                        🔔 No notifications yet — you&apos;re all caught up!
                    </p>
                </section>
            ) : null}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {notifications.map((n) => (
                    <div
                        key={n.id}
                        onClick={() => handleClick(n)}
                        role={n.link ? 'button' : undefined}
                        tabIndex={n.link ? 0 : undefined}
                        onKeyDown={n.link ? (e) => e.key === 'Enter' && handleClick(n) : undefined}
                        style={{
                            display: 'flex',
                            gap: '0.75rem',
                            padding: '0.875rem 1rem',
                            borderRadius: '10px',
                            border: '1px solid var(--border)',
                            background: n.read_at ? 'transparent' : 'var(--jade-soft, #f0fdf4)',
                            cursor: n.link ? 'pointer' : 'default',
                            transition: 'background 0.15s'
                        }}
                    >
                        <span style={{ fontSize: '1.4rem', flexShrink: 0, lineHeight: 1.2 }}>
                            {TYPE_ICONS[n.type] || '🔔'}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontWeight: n.read_at ? 400 : 700, marginBottom: '0.1rem', fontSize: '0.95rem' }}>
                                {n.title}
                            </p>
                            {n.body ? (
                                <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: 0 }}>{n.body}</p>
                            ) : null}
                            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                                {formatRelativeTime(n.created_at)}
                            </p>
                        </div>
                        {!n.read_at ? (
                            <span style={{ width: 8, height: 8, background: 'var(--jade, #22c55e)', borderRadius: '50%', flexShrink: 0, marginTop: '0.35rem' }} />
                        ) : null}
                    </div>
                ))}
            </div>
        </div>
    );
}
