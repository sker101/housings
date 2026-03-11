import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { insertRows, selectRows, updateRows } from '../lib/supabase';

const TYPE_ICONS: Record<string, string> = {
    booking_requested: '📋',
    booking_approved: '🎉',
    booking_declined: '❌',
    listing_approved: '✅',
    listing_rejected: '🚫',
    listing_flagged: '⚠️',
    message: '💬',
    system: '🔔',
    system_alert: '🚨',
};

const TYPE_LABELS: Record<string, string> = {
    booking_requested: 'Booking Request',
    booking_approved: 'Booking Approved',
    booking_declined: 'Booking Declined',
    listing_approved: 'Listing Approved',
    listing_rejected: 'Listing Rejected',
    listing_flagged: 'Listing Flagged',
    message: 'New Message',
    system: 'System',
    system_alert: 'System Alert',
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

function ActionButton({ label, onClick, variant = 'primary' }: { label: string; onClick: () => void; variant?: 'primary' | 'ghost' }) {
    return (
        <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className={`btn btn--small${variant === 'ghost' ? ' btn--ghost' : ''}`}
            style={{ minWidth: 80 }}
        >
            {label}
        </button>
    );
}

export default function NotificationsPage() {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');
    const [replySending, setReplySending] = useState(false);

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

            // Mark unread as read
            const unreadIds = rows.filter((n) => !n.read_at).map((n) => n.id);
            if (unreadIds.length > 0) {
                await Promise.all(unreadIds.map((id) =>
                    updateRows('notifications', { read_at: new Date().toISOString() }, {
                        filters: [{ column: 'id', op: 'eq', value: id }],
                        accessToken: token
                    }).catch(() => null)
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

    async function sendReply(n: any) {
        if (!replyText.trim() || !user?.userId || !token) return;
        setReplySending(true);
        try {
            // Look up admin IDs so we can deliver the reply to them
            const admins = await selectRows('profiles', {
                select: 'id',
                filters: [{ column: 'role', op: 'eq', value: 'admin' }],
                limit: 20,
                accessToken: token
            }) as any[];

            if (admins.length === 0) {
                alert('No admin accounts found to send the reply to.');
                return;
            }

            // Insert a notification for each admin
            await Promise.all(admins.map((admin: any) =>
                insertRows('notifications', {
                    user_id: admin.id,
                    type: 'message',
                    title: `Reply from ${user.fullName || 'a user'}: "${n.title}"`,
                    body: replyText.trim(),
                    link: null
                }, { accessToken: token })
            ));

            setReplyText('');
            setReplyingTo(null);
            alert('Reply sent to admin!');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setReplySending(false);
        }
    }

    function getActions(n: any) {
        const actions: Array<{ label: string; action: () => void; variant?: 'primary' | 'ghost' }> = [];

        if (n.link) {
            const label =
                n.type === 'booking_requested' ? '📋 View Booking' :
                    n.type === 'booking_approved' ? '🎉 View Booking' :
                        n.type === 'booking_declined' ? '🔍 Find Rooms' :
                            n.type === 'listing_approved' ? '🏠 View Listing' :
                                n.type === 'listing_rejected' ? '✏️ Edit & Resubmit' :
                                    n.type === 'listing_flagged' ? '⚠️ View Dashboard' :
                                        n.type === 'message' ? '💬 Open Chat' : '→ View';
            actions.push({ label, action: () => navigate(n.link) });
        }

        if (n.type === 'system_alert' || n.type === 'system') {
            actions.push({
                label: replyingTo === n.id ? '✕ Cancel' : '💬 Reply',
                action: () => {
                    if (replyingTo === n.id) { setReplyingTo(null); setReplyText(''); }
                    else { setReplyingTo(n.id); setReplyText(''); }
                },
                variant: 'ghost'
            });
        }

        if (n.type === 'booking_declined') {
            actions.push({ label: '🔍 Browse Rooms', action: () => navigate('/search'), variant: 'ghost' });
        }

        if (n.type === 'listing_rejected') {
            actions.push({ label: '💬 Contact Support', action: () => navigate('/messages'), variant: 'ghost' });
        }

        return actions;
    }

    const unread = notifications.filter((n) => !n.read_at).length;

    return (
        <div className="container section">
            <div className="section__header">
                <div>
                    <h1>🔔 Notifications {unread > 0 ? <span style={{ fontSize: '0.8rem', background: 'var(--jade, #22c55e)', color: 'white', borderRadius: '999px', padding: '0.2rem 0.6rem', marginLeft: '0.5rem', verticalAlign: 'middle' }}>{unread} new</span> : null}</h1>
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {notifications.map((n) => {
                    const actions = getActions(n);
                    const isReplying = replyingTo === n.id;

                    return (
                        <div
                            key={n.id}
                            style={{
                                borderRadius: '12px',
                                border: `1px solid ${n.type === 'system_alert' ? 'var(--danger, #ef4444)' : 'var(--border)'}`,
                                background: n.read_at ? 'var(--surface)' : (n.type === 'system_alert' ? '#fff5f5' : 'var(--jade-soft, #f0fdf4)'),
                                overflow: 'hidden',
                                transition: 'box-shadow 0.15s',
                            }}
                        >
                            {/* Main notification row */}
                            <div
                                style={{
                                    display: 'flex',
                                    gap: '0.75rem',
                                    padding: '0.875rem 1rem',
                                    cursor: n.link ? 'pointer' : 'default',
                                }}
                                onClick={() => n.link && navigate(n.link)}
                                role={n.link ? 'button' : undefined}
                                tabIndex={n.link ? 0 : undefined}
                                onKeyDown={n.link ? (e) => e.key === 'Enter' && navigate(n.link) : undefined}
                            >
                                <span style={{ fontSize: '1.5rem', flexShrink: 0, lineHeight: 1.2 }}>
                                    {TYPE_ICONS[n.type] || '🔔'}
                                </span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: n.type === 'system_alert' ? '#b91c1c' : 'var(--muted)' }}>
                                            {TYPE_LABELS[n.type] || n.type}
                                        </span>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                                            · {formatRelativeTime(n.created_at)}
                                        </span>
                                    </div>
                                    <p style={{ fontWeight: n.read_at ? 500 : 700, marginBottom: '0.1rem', fontSize: '0.95rem' }}>
                                        {n.title}
                                    </p>
                                    {n.body ? (
                                        <p style={{ fontSize: '0.875rem', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>{n.body}</p>
                                    ) : null}
                                </div>
                                {!n.read_at ? (
                                    <span style={{ width: 9, height: 9, background: n.type === 'system_alert' ? '#ef4444' : 'var(--jade, #22c55e)', borderRadius: '50%', flexShrink: 0, marginTop: '0.4rem' }} />
                                ) : null}
                            </div>

                            {/* Action buttons row */}
                            {actions.length > 0 ? (
                                <div style={{ borderTop: '1px solid var(--border)', padding: '0.5rem 1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', background: 'rgba(0,0,0,0.02)' }}>
                                    {actions.map((a) => (
                                        <ActionButton key={a.label} label={a.label} onClick={a.action} variant={a.variant} />
                                    ))}
                                </div>
                            ) : null}

                            {/* Reply box */}
                            {isReplying ? (
                                <div style={{ borderTop: '1px solid var(--border)', padding: '0.75rem 1rem', background: '#fafafa' }}>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
                                        Replying to admin broadcast — your message will be recorded.
                                    </p>
                                    <textarea
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        placeholder="Type your response..."
                                        rows={3}
                                        style={{ width: '100%', marginBottom: '0.5rem', resize: 'vertical', fontSize: '0.9rem' }}
                                    />
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            type="button"
                                            className="btn btn--small"
                                            disabled={replySending || !replyText.trim()}
                                            onClick={() => sendReply(n)}
                                        >
                                            {replySending ? 'Sending…' : '📤 Send Reply'}
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn--ghost btn--small"
                                            onClick={() => { setReplyingTo(null); setReplyText(''); }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
