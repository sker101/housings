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
  system_alert: '🚨'
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
  system_alert: 'System Alert'
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

function ActionButton({
  label,
  onClick,
  variant = 'primary'
}: {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'ghost';
}) {
  const cleanLabel = label.replace(/^[^\\w]+\\s*/, '');
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`nact-btn${variant === 'ghost' ? ' ghost' : ''}${variant === 'primary' ? ' primary' : ''}`}
    >
      {cleanLabel}
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
    if (!user?.userId || !token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const rows = (await selectRows('notifications', {
        select: 'id,type,title,body,link,read_at,created_at',
        filters: [{ column: 'user_id', op: 'eq', value: user.userId }],
        order: 'created_at.desc',
        limit: 100,
        accessToken: token
      })) as any[];
      setNotifications(rows);

      const unreadIds = rows.filter((n) => !n.read_at).map((n) => n.id);
      if (unreadIds.length > 0) {
        await Promise.all(
          unreadIds.map((id) =>
            updateRows(
              'notifications',
              { read_at: new Date().toISOString() },
              {
                filters: [{ column: 'id', op: 'eq', value: id }],
                accessToken: token
              }
            ).catch(() => null)
          )
        );
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
      const admins = (await selectRows('profiles', {
        select: 'id',
        filters: [{ column: 'role', op: 'eq', value: 'admin' }],
        limit: 20,
        accessToken: token
      })) as any[];

      if (admins.length === 0) {
        alert('No admin accounts found to send the reply to.');
        return;
      }

      await Promise.all(
        admins.map((admin: any) =>
          insertRows(
            'notifications',
            {
              user_id: admin.id,
              type: 'message',
              title: `Reply from ${user.fullName || 'a user'}: "${n.title}"`,
              body: replyText.trim(),
              link: null
            },
            { accessToken: token }
          )
        )
      );

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
        n.type === 'booking_requested'
          ? '📋 View Booking'
          : n.type === 'booking_approved'
            ? '🎉 View Booking'
            : n.type === 'booking_declined'
              ? '🔍 Find Rooms'
              : n.type === 'listing_approved'
                ? '🏠 View Listing'
                : n.type === 'listing_rejected'
                  ? '✏️ Edit & Resubmit'
                  : n.type === 'listing_flagged'
                    ? '⚠️ View Dashboard'
                    : n.type === 'message'
                      ? '💬 Open Chat'
                      : '→ View';
      actions.push({ label, action: () => navigate(n.link) });
    }

    if (n.type === 'system_alert' || n.type === 'system') {
      actions.push({
        label: replyingTo === n.id ? '✕ Cancel' : '💬 Reply',
        action: () => {
          if (replyingTo === n.id) {
            setReplyingTo(null);
            setReplyText('');
          } else {
            setReplyingTo(n.id);
            setReplyText('');
          }
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
    <>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}} .nt-page{padding:2rem} .nt-hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.5rem} .back-btn{padding:6px 14px;border-radius:9px;border:0.5px solid var(--border);background:#fff;font-size:12px;color:var(--ink);cursor:pointer;text-decoration:none} .new-badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;background:#EAF3DE;color:#27500A;margin-left:8px;vertical-align:middle} .nt-list{display:flex;flex-direction:column;gap:8px} .ncard{background:#ffffff;border:0.5px solid var(--border);border-radius:13px;overflow:hidden;transition:box-shadow 0.15s} .ncard.is-unread{background:#f6fbf8;border-color:#97C459} .ncard.is-alert{background:#FEF2F1;border-color:#F09595} .ncard-main{padding:13px 16px;display:flex;gap:12px;align-items:flex-start;cursor:pointer} .nicon{width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0} .ni-booking{background:#EAF3DE} .ni-listing{background:#E6F1FB} .ni-message{background:#EEEDFE} .ni-system_alert{background:#FCEBEB} .ni-system{background:#FAEEDA} .ni-default{background:var(--cream)} .nbody-wrap{flex:1;min-width:0} .ntype{font-size:10px;font-weight:500;color:var(--mid);text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px} .ntype.alert{color:#791F1F} .ntitle{font-size:13px;line-height:1.4;color:var(--ink)} .ntitle.unread{font-weight:600} .nbody-text{font-size:11px;color:var(--mid);margin-top:3px;line-height:1.5} .ntime-row{font-size:10px;color:var(--mid);margin-top:4px} .unread-dot{width:8px;height:8px;border-radius:50%;background:var(--jade);flex-shrink:0;margin-top:3px} .unread-dot.alert{background:#A32D2D} .ncard-actions{padding:8px 16px;border-top:0.5px solid var(--border);display:flex;gap:8px;flex-wrap:wrap;background:rgba(0,0,0,0.02)} .nact-btn{padding:5px 12px;border-radius:7px;border:0.5px solid var(--border);background:#fff;font-size:11px;font-weight:500;cursor:pointer;color:var(--ink)} .nact-btn.primary{background:var(--jade);color:#fff;border-color:transparent} .nact-btn.ghost{background:transparent;color:var(--mid)} .reply-box{padding:12px 16px;border-top:0.5px solid var(--border);background:#fafafa} .reply-hint{font-size:11px;color:var(--mid);margin-bottom:8px} .reply-textarea{width:100%;padding:8px 10px;border-radius:8px;border:0.5px solid var(--border);font-size:12px;resize:vertical;outline:none;font-family:inherit;line-height:1.5;min-height:70px} .reply-actions{display:flex;gap:6px;margin-top:8px} .nt-empty{padding:3rem 2rem;text-align:center;color:var(--mid);font-size:13px;background:#ffffff;border:0.5px solid var(--border);border-radius:13px} @media(max-width:768px){.nt-page{padding:1rem}}`}</style>

      <div className="nt-page">
        <div className="nt-hdr">
          <div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>
              Notifications {unread > 0 ? <span className="new-badge">{unread} new</span> : null}
            </h1>
            <p style={{ fontSize: 12, color: 'var(--mid)', marginTop: 4 }}>
              Updates about your bookings, listings and messages
            </p>
          </div>
          <Link to={-1 as any} className="back-btn">
            ← Back
          </Link>
        </div>

        {error ? (
          <p
            style={{
              fontSize: 13,
              color: '#791F1F',
              background: '#FCEBEB',
              padding: '10px 12px',
              borderRadius: 9,
              marginBottom: '1rem'
            }}
          >
            {error}
          </p>
        ) : null}

        {loading ? (
          <div className="nt-list">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={`nt-skel-${i}`}
                style={{
                  height: 80,
                  borderRadius: 13,
                  background: 'var(--cream)',
                  animation: 'pulse 1.5s ease-in-out infinite'
                }}
              />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="nt-empty">You&apos;re all caught up — no notifications yet.</div>
        ) : (
          <div className="nt-list">
            {notifications.map((n) => {
              const isAlert = n.type === 'system_alert';
              const isUnread = !n.read_at;
              const actions = getActions(n);
              const isReplying = replyingTo === n.id;
              const iconClass = `nicon ni-${n.type || 'default'}`;

              return (
                <div
                  key={n.id}
                  className={`ncard${isAlert ? ' is-alert' : isUnread ? ' is-unread' : ''}`}
                >
                  <div
                    className="ncard-main"
                    onClick={() => n.link && navigate(n.link)}
                    role={n.link ? 'button' : undefined}
                    tabIndex={n.link ? 0 : undefined}
                    onKeyDown={n.link ? (e) => e.key === 'Enter' && navigate(n.link) : undefined}
                  >
                    <div className={iconClass}>{TYPE_ICONS[n.type] || '🔔'}</div>
                    <div className="nbody-wrap">
                      <p className={`ntype${isAlert ? ' alert' : ''}`} style={{ margin: 0 }}>
                        {TYPE_LABELS[n.type] || n.type}
                      </p>
                      <p className={`ntitle${isUnread ? ' unread' : ''}`} style={{ margin: '2px 0 0 0' }}>
                        {n.title}
                      </p>
                      {n.body ? (
                        <p className="nbody-text" style={{ margin: '3px 0 0 0' }}>
                          {n.body}
                        </p>
                      ) : null}
                      <p className="ntime-row" style={{ margin: '4px 0 0 0' }}>
                        {formatRelativeTime(n.created_at)}
                      </p>
                    </div>
                    {isUnread ? (
                      <div className={`unread-dot${isAlert ? ' alert' : ''}`} />
                    ) : null}
                  </div>

                  {actions.length > 0 ? (
                    <div className="ncard-actions">
                      {actions.map((a, idx) => (
                        <ActionButton
                          key={a.label}
                          label={a.label}
                          onClick={a.action}
                          variant={a.variant || (idx === 0 ? 'primary' : 'ghost')}
                        />
                      ))}
                    </div>
                  ) : null}

                  {isReplying ? (
                    <div className="reply-box">
                      <p className="reply-hint">Replying to admin — your message will be recorded.</p>
                      <textarea
                        className="reply-textarea"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Type your response..."
                        rows={3}
                      />
                      <div className="reply-actions">
                        <button
                          type="button"
                          className="nact-btn primary"
                          disabled={replySending || !replyText.trim()}
                          onClick={() => sendReply(n)}
                        >
                          {replySending ? 'Sending...' : 'Send reply'}
                        </button>
                        <button
                          type="button"
                          className="nact-btn"
                          onClick={() => {
                            setReplyingTo(null);
                            setReplyText('');
                          }}
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
        )}
      </div>
    </>
  );
}
