import { useEffect, useMemo, useState, useRef } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MessageCircle, Inbox, Send } from 'lucide-react';
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

  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

        if (!threadId && merged[0]?.id && window.innerWidth > 768) {
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
      setError(err.message);
      setMessages([]);
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

  // Helper to sanitize message content - replace UUIDs with placeholder
  const sanitizeMessage = (body: string) => {
    if (!body) return body;
    // Replace UUID patterns with a placeholder
    return body.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '[Property ID]');
  };

  return (
    <>
      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        @keyframes slideIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes bubblePop{0%{transform:scale(0.9);opacity:0}50%{transform:scale(1.02)}100%{transform:scale(1);opacity:1}}
        .msg-shell{display:flex;height:calc(100vh - 130px);min-height:500px;border:1px solid #e5e7eb;border-radius:20px;overflow:hidden;background:#fff;margin:1.5rem;box-shadow:0 4px 20px rgba(0,0,0,0.08)}
        .mobile-back-btn{display:none;padding:8px 14px;margin-right:12px;border:1px solid #e5e7eb;border-radius:10px;background:#fff;font-size:13px;font-weight:600;color:#374151;cursor:pointer;transition:all 0.2s ease}
        .mobile-back-btn:hover{background:#f3f4f6;border-color:#1D9E75;color:#1D9E75}
        .conv-sidebar{width:320px;flex-shrink:0;border-right:1px solid #e5e7eb;display:flex;flex-direction:column;background:linear-gradient(180deg,#fff 0%,#f8fafc 100%)}
        .conv-sidebar-hdr{padding:20px;border-bottom:1px solid #e5e7eb;background:linear-gradient(135deg,#1D9E75 0%,#15805d 100%);color:white}
        .conv-sidebar-title{font-size:16px;font-weight:700;color:white;margin:0}
        .conv-sidebar-sub{font-size:13px;color:rgba(255,255,255,0.85);margin-top:4px;font-weight:500}
        .conv-list{flex:1;overflow-y:auto;padding:8px}
        .empty-thread{display:flex;align-items:center;justify-content:center;height:100%;color:#9ca3af;font-size:15px;font-weight:500;background:linear-gradient(180deg,#f8fafc 0%,#f1f5f9 100%)}
        /* Thread Header */
        .thread-hdr{padding:18px 24px;border-bottom:1px solid #e5e7eb;background:white;display:flex;align-items:center;gap:12px;box-shadow:0 2px 8px rgba(0,0,0,0.06)}
        .thread-title{font-size:16px;font-weight:700;color:#111827;margin:0;line-height:1.3}
        .thread-sub{font-size:12px;color:#6b7280;margin:8px 0 0;display:flex;align-items:center;gap:8px}
        .status-row{display:flex;align-items:center;gap:8px}
        .status-row select{padding:8px 12px;border-radius:8px;border:1px solid #e5e7eb;background:#fff;font-size:12px;color:#374151;outline:none;cursor:pointer}
        .status-upd-btn{padding:8px 16px;border-radius:8px;border:none;background:linear-gradient(135deg,#1D9E75 0%,#15805d 100%);color:white;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.2s ease;box-shadow:0 2px 8px rgba(29,158,117,0.3)}
        .status-upd-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 4px 12px rgba(29,158,117,0.4)}
        .status-upd-btn:disabled{opacity:0.6;cursor:not-allowed}
        .live-dot{width:8px;height:8px;border-radius:50%;background:#22c55e;animation:pulse 2s infinite}
        .msg-list{flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:16px;background:linear-gradient(180deg,#f8fafc 0%,#f0fdf4 50%,#f8fafc 100%)}
        
        /* Message Bubbles with High Contrast */
        .bubble{max-width:75%;padding:14px 18px;border-radius:18px;position:relative;animation:bubblePop 0.3s ease-out;font-size:14px;line-height:1.5;word-wrap:break-word;box-shadow:0 2px 8px rgba(0,0,0,0.08)}
        
        /* My Messages - Green background with WHITE text */
        .bubble.mine{align-self:flex-end;background:linear-gradient(135deg,#1D9E75 0%,#15805d 100%);color:white;border-bottom-right-radius:4px}
        .bubble.mine .bubble-sender{color:rgba(255,255,255,0.85)}
        .bubble.mine p{color:white;font-weight:500}
        .bubble.mine .bubble-time{color:rgba(255,255,255,0.75);text-align:right}
        
        /* Their Messages - White background with BLACK/DARK text */
        .bubble.theirs{align-self:flex-start;background:white;color:#1f2937;border:1px solid #e5e7eb;border-bottom-left-radius:4px}
        .bubble.theirs .bubble-sender{color:#6b7280}
        .bubble.theirs p{color:#111827;font-weight:500}
        .bubble.theirs .bubble-time{color:#9ca3af}
        
        /* Admin Messages - Amber background with DARK text */
        .bubble.is-admin{align-self:flex-start;background:linear-gradient(135deg,#fef3c7 0%,#fde68a 100%);color:#92400e;border:1px solid #fcd34d;border-bottom-left-radius:4px}
        .bubble.is-admin .bubble-sender{color:#b45309;font-weight:700}
        .bubble.is-admin p{color:#78350f;font-weight:500}
        .bubble.is-admin .bubble-time{color:#b45309}
        
        .bubble-sender{font-size:12px;font-weight:600;margin-bottom:6px;display:block}
        .bubble p{margin:0}
        .bubble-time{font-size:11px;margin-top:8px;display:block;font-weight:500}
        
        /* Compose Area */
        .compose{padding:16px 20px;background:white;border-top:1px solid #e5e7eb;display:flex;gap:12px;align-items:flex-end;box-shadow:0 -2px 10px rgba(0,0,0,0.03)}
        .compose textarea{flex:1;padding:14px 18px;border:2px solid #e5e7eb;border-radius:16px;font-size:14px;resize:none;min-height:52px;max-height:140px;font-family:inherit;transition:all 0.2s ease;background:#f9fafb}
        .compose textarea:focus{outline:none;border-color:#1D9E75;background:white;box-shadow:0 0 0 4px rgba(29,158,117,0.1)}
        .compose textarea::placeholder{color:#9ca3af}
        
        /* Send Button */
        .send-btn{padding:14px 24px;background:linear-gradient(135deg,#1D9E75 0%,#15805d 100%);color:white;border:none;border-radius:14px;font-size:14px;font-weight:600;cursor:pointer;transition:all 0.2s ease;box-shadow:0 4px 12px rgba(29,158,117,0.3);display:flex;align-items:center;gap:6px}
        .send-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 6px 20px rgba(29,158,117,0.4)}
        .send-btn:disabled{opacity:0.5;cursor:not-allowed;transform:none}

        .conv-item{padding:16px;margin:4px 8px;border-radius:12px;cursor:pointer;display:flex;gap:12px;align-items:flex-start;text-decoration:none;transition:all 0.25s cubic-bezier(0.4,0,0.2,1);border:1px solid transparent}
        .conv-item:hover{background:#f0fdf4;border-color:#bbf7d0;transform:translateX(4px);box-shadow:0 2px 8px rgba(29,158,117,0.1)}
        .conv-item.is-active{background:linear-gradient(135deg,#dcfce7 0%,#bbf7d0 100%);border-color:#1D9E75;box-shadow:0 4px 12px rgba(29,158,117,0.15)}
        .conv-item.is-admin{background:#fef2f2}
        .conv-item.is-admin:hover{background:#fee2e2;border-color:#fecaca}
        .conv-item.is-admin.is-active{background:linear-gradient(135deg,#fee2e2 0%,#fecaca 100%);border-color:#ef4444}
        .conv-av{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#1D9E75 0%,#15805d 100%);color:white;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;flex-shrink:0;box-shadow:0 2px 8px rgba(29,158,117,0.25);border:2px solid rgba(255,255,255,0.3)}
        .conv-av.admin{background:linear-gradient(135deg,#ef4444 0%,#b91c1c 100%);box-shadow:0 2px 8px rgba(239,68,68,0.25)}
        .conv-info{flex:1;min-width:0}
        .conv-name{font-size:14px;font-weight:600;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin:0}
        .conv-name.admin{color:#991b1b}
        .conv-preview{font-size:13px;color:#6b7280;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.4}
        .conv-item.is-active .conv-preview{color:#15803d}
        .conv-meta{display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0}
        .conv-time{font-size:12px;color:#9ca3af;font-weight:500}
        .conv-item.is-active .conv-time{color:#1D9E75;font-weight:600}
        .unread-dot{width:8px;height:8px;border-radius:50%;background:#1D9E75;box-shadow:0 0 0 2px rgba(29,158,117,0.2)}
        .unread-dot.admin{background:#ef4444;box-shadow:0 0 0 2px rgba(239,68,68,0.2)}
        .status-pill{display:inline-flex;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px}
        .sp-open{background:#fef3c7;color:#92400e}
        .sp-interested{background:#dcfce7;color:#166534}
        .sp-booked{background:#dbeafe;color:#1e40af}
        .sp-unavailable{background:#f3f4f6;color:#6b7280}
        .thread{flex:1;display:flex;flex-direction:column;background:#f8fafc;min-width:0}
      `}</style>

        <div className="msg-shell">
          {/* Sidebar */}
          <div className="conv-sidebar">
            <div className="conv-sidebar-hdr">
              <p className="conv-sidebar-title">
                <MessageCircle size={20} style={{ marginRight: '8px' }} />
                Inquiries
              </p>
              <p className="conv-sidebar-sub">
                {conversations.length} {conversations.length === 1 ? 'conversation' : 'conversations'}
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
                  : conv.otherProfile?.full_name || 'Property Owner';
                
                // Check if title looks like a UUID (contains hex characters and dashes in UUID pattern)
                const isUuid = conv.listing?.title && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(conv.listing?.title);
                const preview = conv.listing?.title && !isUuid
                  ? conv.listing?.title
                  : humanizeStatus(conv.inquiry_status);
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
            <div className="empty-thread">
              <div style={{ textAlign: 'center' }}>
                <Inbox size={64} style={{ color: '#1D9E75', opacity: 0.4, marginBottom: '16px' }} />
                <p>Select a conversation to start messaging</p>
              </div>
            </div>
          ) : (
            <>
              <div className="thread-hdr">
                <button type="button" className="mobile-back-btn" onClick={() => navigate('/messages')} aria-label="Back">
                  ← Back
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <p className="thread-title" style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#111827', lineHeight: '1.3' }}>
                      {(() => {
                        const isUuid = activeConversation.listing?.title && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeConversation.listing?.title);
                        return activeConversation.listing?.title && !isUuid
                          ? activeConversation.listing?.title
                          : 'Property Inquiry';
                      })()}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#6b7280',
                        padding: '4px 12px',
                        background: '#f3f4f6',
                        borderRadius: '20px'
                      }}>
                        <span style={{ fontSize: '14px' }}>👤</span>
                        {activeConversation.otherProfile?.full_name || 'Unknown'}
                      </span>
                    </div>
                  </div>
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
                      <p style={{ margin: 0 }}>{sanitizeMessage(m.body)}</p>
                      <span className={`bubble-time${mine ? ' mine' : ''}`}>
                        {formatTimestamp(m.created_at)}
                        {mine ? (m.seen_at ? ' · Seen' : ' · Sent') : ''}
                      </span>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <form className="compose" onSubmit={submitMessage}>
                <textarea
                  value={messageBody}
                  onChange={(event) => setMessageBody(event.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      submitMessage(e);
                    }
                  }}
                  placeholder={t('dashboard.writeMessage')}
                />
                <button className="send-btn" type="submit" disabled={!messageBody.trim()}>
                  <Send size={18} style={{ marginRight: '6px' }} />
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
