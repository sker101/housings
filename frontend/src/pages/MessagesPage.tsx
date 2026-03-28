import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { subscribeToTableChanges } from '../lib/realtime';
import { insertRows, selectRows, updateRows } from '../lib/supabase';

const INQUIRY_STATUS_OPTIONS = ['open', 'interested', 'unavailable', 'booked'];

function formatTimestamp(value) {
  if (!value) {
    return '';
  }

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function humanizeStatus(value) {
  if (!value) {
    return 'Open';
  }

  return String(value)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function MessagesPage() {
  const navigate = useNavigate();
  const { threadId } = useParams();
  const { user, token } = useAuth();
  const { t } = useTranslation();

  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messageBody, setMessageBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [realtimeState, setRealtimeState] = useState('connecting');
  const [statusValue, setStatusValue] = useState('open');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === threadId) || null,
    [conversations, threadId]
  );

  const canManageInquiryStatus = Boolean(
    activeConversation &&
    user?.userId &&
    (user.userId === activeConversation.lister_id || user.role === 'admin')
  );

  useEffect(() => {
    setStatusValue(activeConversation?.inquiry_status || 'open');
  }, [activeConversation?.id, activeConversation?.inquiry_status]);

  useEffect(() => {
    let mounted = true;

    async function loadConversations() {
      if (!user?.userId || !token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const rows = await selectRows('conversations', {
          select:
            'id,listing_id,tenant_id,lister_id,inquiry_status,move_in_date,last_message_at,created_at',
          or: `tenant_id.eq.${user.userId},lister_id.eq.${user.userId}`,
          order: 'last_message_at.desc',
          limit: 100,
          accessToken: token
        });

        const listingIds = rows.map((row) => row.listing_id).filter(Boolean);
        const listingMap = new Map();

        if (listingIds.length > 0) {
          const listings = await selectRows('listings', {
            select: 'id,title,region,district,ward,street',
            filters: [
              {
                column: 'id',
                op: 'in',
                value: `(${listingIds.join(',')})`
              }
            ],
            accessToken: token
          });

          listings.forEach((listing) => {
            listingMap.set(listing.id, listing);
          });
        }

        const participantIds = Array.from(
          new Set(
            rows
              .map((r) => (r.tenant_id === user.userId ? r.lister_id : r.tenant_id))
              .filter(Boolean)
          )
        );
        const participantProfileMap = new Map();

        if (participantIds.length > 0) {
          const profiles = await selectRows('profiles', {
            select: 'id,role,full_name',
            filters: [{ column: 'id', op: 'in', value: `(${participantIds.join(',')})` }],
            accessToken: token
          });
          profiles.forEach((p) => participantProfileMap.set(p.id, p));
        }

        const merged = rows.map((row) => {
          const otherId = row.tenant_id === user.userId ? row.lister_id : row.tenant_id;
          const otherProfile = participantProfileMap.get(otherId) || null;
          return {
            ...row,
            listing: listingMap.get(row.listing_id) || null,
            otherProfile,
            isAdmin: otherProfile?.role === 'admin'
          };
        });

        merged.sort((a, b) => {
          if (a.isAdmin && !b.isAdmin) return -1;
          if (!a.isAdmin && b.isAdmin) return 1;
          const timeA = new Date(a.last_message_at || a.created_at).getTime();
          const timeB = new Date(b.last_message_at || b.created_at).getTime();
          return timeB - timeA;
        });

        if (!mounted) {
          return;
        }

        setConversations(merged);

        if (!threadId && merged[0]?.id) {
          navigate(`/messages/${merged[0].id}`, { replace: true });
        }
      } catch (err) {
        if (mounted) {
          setError(err.message);
          setConversations([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadConversations();

    if (!user?.userId || !token) {
      return () => {
        mounted = false;
      };
    }

    const handleConversationEvent = () => {
      loadConversations();
    };

    const unsubscribeTenant = subscribeToTableChanges({
      table: 'conversations',
      filter: `tenant_id=eq.${user.userId}`,
      accessToken: token,
      onEvent: handleConversationEvent,
      onStatus: (status) => setRealtimeState(status)
    });

    const unsubscribeLister = subscribeToTableChanges({
      table: 'conversations',
      filter: `lister_id=eq.${user.userId}`,
      accessToken: token,
      onEvent: handleConversationEvent,
      onStatus: () => {}
    });

    return () => {
      mounted = false;
      unsubscribeTenant();
      unsubscribeLister();
    };
  }, [user?.userId, token, threadId, navigate]);

  useEffect(() => {
    let mounted = true;

    async function loadMessages() {
      if (!threadId || !token) {
        setMessages([]);
        return;
      }

      try {
        if (user?.userId) {
          await updateRows(
            'messages',
            { seen_at: new Date().toISOString() },
            {
              filters: [
                { column: 'conversation_id', op: 'eq', value: threadId },
                { column: 'sender_id', op: 'neq', value: user.userId },
                { column: 'seen_at', op: 'is', value: 'null' }
              ],
              accessToken: token
            }
          );
        }

        const messageRows = await selectRows('messages', {
          select: 'id,conversation_id,sender_id,body,seen_at,created_at',
          filters: [{ column: 'conversation_id', op: 'eq', value: threadId }],
          order: 'created_at.asc',
          accessToken: token
        });

        const senderIds = Array.from(
          new Set(messageRows.map((m) => m.sender_id).filter((id) => id !== user.userId))
        );
        const profileMap = new Map();

        if (senderIds.length > 0) {
          const profiles = await selectRows('profiles', {
            select: 'id,role,full_name',
            filters: [{ column: 'id', op: 'in', value: `(${senderIds.join(',')})` }],
            accessToken: token
          });
          profiles.forEach((p) => profileMap.set(p.id, p));
        }

        const rows = messageRows.map((m) => ({
          ...m,
          senderProfile: m.sender_id === user.userId ? user : profileMap.get(m.sender_id)
        }));

        if (mounted) {
          setMessages(rows);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message);
          setMessages([]);
        }
      }
    }

    loadMessages();

    if (!threadId || !token) {
      return () => {
        mounted = false;
      };
    }

    const unsubscribe = subscribeToTableChanges({
      table: 'messages',
      filter: `conversation_id=eq.${threadId}`,
      accessToken: token,
      onEvent: () => {
        loadMessages();
      },
      onStatus: (status) => setRealtimeState(status)
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, token, user?.userId]);

  const submitMessage = async (event) => {
    event.preventDefault();

    if (!threadId || !messageBody.trim() || !user?.userId || !token) {
      return;
    }

    try {
      await insertRows(
        'messages',
        {
          conversation_id: threadId,
          sender_id: user.userId,
          body: messageBody.trim()
        },
        { accessToken: token }
      );

      setMessageBody('');

      const messageRows = await selectRows('messages', {
        select: 'id,conversation_id,sender_id,body,seen_at,created_at',
        filters: [{ column: 'conversation_id', op: 'eq', value: threadId }],
        order: 'created_at.asc',
        accessToken: token
      });

      const senderIds = Array.from(
        new Set(messageRows.map((m) => m.sender_id).filter((id) => id !== user.userId))
      );
      const profileMap = new Map();

      if (senderIds.length > 0) {
        const profiles = await selectRows('profiles', {
          select: 'id,role,full_name',
          filters: [{ column: 'id', op: 'in', value: `(${senderIds.join(',')})` }],
          accessToken: token
        });
        profiles.forEach((p) => profileMap.set(p.id, p));
      }

      const rows = messageRows.map((m) => ({
        ...m,
        senderProfile: m.sender_id === user.userId ? user : profileMap.get(m.sender_id)
      }));

      setMessages(rows);
    } catch (err) {
      setError(err.message);
    }
  };

  const updateInquiryStatus = async () => {
    if (!threadId || !token || !canManageInquiryStatus) {
      return;
    }

    setUpdatingStatus(true);
    setError('');

    try {
      const rows = await updateRows(
        'conversations',
        { inquiry_status: statusValue },
        {
          filters: [{ column: 'id', op: 'eq', value: threadId }],
          accessToken: token
        }
      );

      const updated = rows[0];
      if (updated) {
        setConversations((prev) =>
          prev.map((conversation) =>
            conversation.id === threadId
              ? { ...conversation, inquiry_status: updated.inquiry_status }
              : conversation
          )
        );
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const formatListTime = (value: string | null | undefined) => {
    if (!value) return '';
    const d = new Date(value);
    const now = new Date();
    const sameDay =
      d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (sameDay) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString();
  };

  return (
    <>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}} .msg-shell{display:flex;height:calc(100vh - 130px);min-height:500px;border:0.5px solid var(--border);border-radius:16px;overflow:hidden;background:#ffffff;margin:1.5rem} .conv-sidebar{width:260px;flex-shrink:0;border-right:0.5px solid var(--border);display:flex;flex-direction:column} .conv-sidebar-hdr{padding:14px 16px;border-bottom:0.5px solid var(--border)} .conv-sidebar-title{font-size:13px;font-weight:600;color:var(--ink)} .conv-sidebar-sub{font-size:11px;color:var(--mid);margin-top:2px} .conv-list{flex:1;overflow-y:auto} .conv-item{padding:12px 16px;border-bottom:0.5px solid var(--border);cursor:pointer;display:flex;gap:10px;align-items:flex-start;text-decoration:none} .conv-item:hover{background:var(--cream)} .conv-item.is-active{background:#EAF3DE} .conv-item.is-admin{background:#FEF2F1} .conv-item.is-admin.is-active{background:#FCEBEB} .conv-av{width:34px;height:34px;border-radius:50%;background:#EEEDFE;color:#3C3489;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;flex-shrink:0} .conv-av.admin{background:#FCEBEB;color:#791F1F} .conv-info{flex:1;min-width:0} .conv-name{font-size:12px;font-weight:500;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis} .conv-name.admin{color:#791F1F} .conv-preview{font-size:11px;color:var(--mid);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis} .conv-meta{display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0} .conv-time{font-size:10px;color:var(--mid)} .unread-dot{width:7px;height:7px;border-radius:50%;background:var(--jade)} .unread-dot.admin{background:#A32D2D} .status-pill{display:inline-flex;padding:1px 7px;border-radius:20px;font-size:10px;font-weight:500} .sp-open{background:#EAF3DE;color:#27500A} .sp-interested{background:#E6F1FB;color:#0C447C} .sp-booked{background:#EEEDFE;color:#3C3489} .sp-unavailable{background:#F1EFE8;color:#444441} .thread{flex:1;display:flex;flex-direction:column;min-width:0} .thread-hdr{padding:13px 18px;border-bottom:0.5px solid var(--border);display:flex;justify-content:space-between;align-items:flex-start;gap:12px} .thread-title{font-size:13px;font-weight:600;color:var(--ink)} .thread-sub{font-size:11px;color:var(--mid);margin-top:2px;display:flex;align-items:center;gap:6px} .live-dot{width:6px;height:6px;border-radius:50%;background:#3B6D11;flex-shrink:0} .status-row{display:flex;align-items:center;gap:6px;flex-shrink:0} .status-row select{padding:4px 8px;border-radius:7px;border:0.5px solid var(--border);background:#fff;font-size:11px;color:var(--ink);outline:none} .status-upd-btn{padding:5px 12px;border-radius:7px;border:none;background:var(--jade);color:#fff;font-size:11px;font-weight:600;cursor:pointer} .msg-list{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;background:var(--cream)} .bubble{max-width:68%;padding:10px 13px;border-radius:12px;font-size:12px;line-height:1.5;display:flex;flex-direction:column} .bubble.theirs{background:#ffffff;border:0.5px solid var(--border);align-self:flex-start;border-radius:4px 12px 12px 12px} .bubble.mine{background:var(--jade);color:#ffffff;align-self:flex-end;border-radius:12px 4px 12px 12px} .bubble.is-admin{background:#FCEBEB;border:0.5px solid #F09595;align-self:flex-start;border-radius:4px 12px 12px 12px} .bubble-sender{font-size:10px;font-weight:500;color:var(--mid);margin-bottom:3px} .bubble-sender.admin-lbl{color:#791F1F;text-transform:uppercase;letter-spacing:.04em} .bubble-time{font-size:10px;color:var(--mid);margin-top:4px;display:block} .bubble-time.mine{color:rgba(255,255,255,0.6)} .compose{padding:12px 16px;border-top:0.5px solid var(--border);display:flex;gap:8px;align-items:flex-end;background:#ffffff} .compose textarea{flex:1;padding:8px 12px;border-radius:10px;border:0.5px solid var(--border);background:#fff;font-size:12px;resize:none;outline:none;line-height:1.5;height:40px;font-family:inherit} .send-btn{padding:8px 18px;border-radius:10px;border:none;background:var(--jade);color:#fff;font-size:12px;font-weight:600;cursor:pointer;flex-shrink:0} .send-btn:disabled{opacity:0.6;cursor:not-allowed} .empty-thread{flex:1;display:flex;align-items:center;justify-content:center;font-size:13px;color:var(--mid)} @media(max-width:768px){.msg-shell{flex-direction:column;margin:1rem;height:auto}.conv-sidebar{width:100%;height:220px;border-right:none;border-bottom:0.5px solid var(--border)}}`}</style>

      <div className="msg-shell">
        <div className="conv-sidebar">
          <div className="conv-sidebar-hdr">
            <p className="conv-sidebar-title">Inquiries</p>
            <p className="conv-sidebar-sub">
              {conversations.length} conversations
            </p>
          </div>
          <div className="conv-list">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={`conv-skel-${i}`}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '0.5px solid var(--border)',
                    background: 'var(--cream)',
                    animation: 'pulse 1.5s ease-in-out infinite',
                    height: 56
                  }}
                />
              ))
            ) : conversations.length === 0 ? (
              <div style={{ padding: '14px 16px', fontSize: 12, color: 'var(--mid)' }}>
                {t('dashboard.noConversations')}
              </div>
            ) : (
              conversations.map((conv: any) => {
                const isActive = conv.id === threadId;
                const displayName = conv.isAdmin
                  ? 'CampusStay Admin'
                  : conv.otherProfile?.full_name || conv.listing?.title || 'Conversation';
                const preview = conv.listing?.title || humanizeStatus(conv.inquiry_status);
                const statusClass = conv.inquiry_status || 'open';
                const convClasses = [
                  'conv-item',
                  isActive ? 'is-active' : '',
                  conv.isAdmin ? 'is-admin' : ''
                ]
                  .filter(Boolean)
                  .join(' ');
                const initials = (conv.otherProfile?.full_name || (conv.isAdmin ? 'CS' : '?'))
                  .split(/\s+/)
                  .map((n: string) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();
                const showUnread = false;

                return (
                  <Link key={conv.id} to={`/messages/${conv.id}`} className={convClasses}>
                    <div className={`conv-av${conv.isAdmin ? ' admin' : ''}`}>{initials}</div>
                    <div className="conv-info">
                      <p className={`conv-name${conv.isAdmin ? ' admin' : ''}`}>{displayName}</p>
                      <p className="conv-preview">{preview}</p>
                    </div>
                    <div className="conv-meta">
                      <span className="conv-time">{formatListTime(conv.last_message_at)}</span>
                      <span className={`status-pill sp-${statusClass}`}>{humanizeStatus(conv.inquiry_status)}</span>
                      {showUnread ? <div className={`unread-dot${conv.isAdmin ? ' admin' : ''}`} /> : null}
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        <div className="thread">
          {!activeConversation ? (
            <div className="empty-thread">Select a conversation to start messaging</div>
          ) : (
            <>
              <div className="thread-hdr">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="thread-title" style={{ margin: 0 }}>
                    {(activeConversation.listing?.title || 'Conversation') +
                      ' — ' +
                      (activeConversation.otherProfile?.full_name || '')}
                  </p>
                  <p className="thread-sub">
                    <span
                      className="live-dot"
                      style={realtimeState === 'subscribed' ? {} : { background: '#888' }}
                    />
                    <span>{realtimeState === 'subscribed' ? 'Live' : 'Connecting...'}</span>
                    <span className={`status-pill sp-${activeConversation.inquiry_status || 'open'}`}>
                      {humanizeStatus(activeConversation.inquiry_status)}
                    </span>
                  </p>
                </div>
                {canManageInquiryStatus ? (
                  <div className="status-row">
                    <select value={statusValue} onChange={(event) => setStatusValue(event.target.value)}>
                      {INQUIRY_STATUS_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {humanizeStatus(option)}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="status-upd-btn"
                      onClick={updateInquiryStatus}
                      disabled={updatingStatus}
                    >
                      {updatingStatus ? 'Saving...' : 'Update'}
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="msg-list">
                {messages.map((m: any) => {
                  const mine = m.sender_id === user?.userId;
                  const adminMsg = m.senderProfile?.role === 'admin' && !mine;
                  const bubbleClass = [
                    'bubble',
                    mine ? 'mine' : 'theirs',
                    adminMsg ? 'is-admin' : ''
                  ]
                    .filter(Boolean)
                    .join(' ');

                  return (
                    <div key={m.id} className={bubbleClass}>
                      {adminMsg ? <p className="bubble-sender admin-lbl">CampusStay Admin</p> : null}
                      {!mine && !adminMsg && m.senderProfile?.full_name ? (
                        <p className="bubble-sender">{m.senderProfile.full_name}</p>
                      ) : null}
                      <p style={{ margin: 0 }}>{m.body}</p>
                      <span className={`bubble-time${mine ? ' mine' : ''}`}>
                        {formatTimestamp(m.created_at)}
                        {mine ? (m.seen_at ? ' · Seen' : ' · Sent') : ''}
                      </span>
                    </div>
                  );
                })}
              </div>

              <form className="compose" onSubmit={submitMessage}>
                <textarea
                  value={messageBody}
                  onChange={(event) => setMessageBody(event.target.value)}
                  placeholder={t('dashboard.writeMessage')}
                />
                <button className="send-btn" type="submit" disabled={!messageBody.trim()}>
                  {t('dashboard.sendBtn')}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {error ? <p className="error-text" style={{ marginLeft: '1.5rem' }}>{error}</p> : null}
    </>
  );
}
