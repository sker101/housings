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

        const participantIds = Array.from(new Set(rows.map(r => r.tenant_id === user.userId ? r.lister_id : r.tenant_id).filter(Boolean)));
        const participantProfileMap = new Map();

        if (participantIds.length > 0) {
          const profiles = await selectRows('profiles', {
            select: 'id,role,full_name',
            filters: [{ column: 'id', op: 'in', value: `(${participantIds.join(',')})` }],
            accessToken: token
          });
          profiles.forEach(p => participantProfileMap.set(p.id, p));
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

        // Always sort admin conversations to the absolute top, then by last message time
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
      onStatus: () => { }
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

        const senderIds = Array.from(new Set(messageRows.map(m => m.sender_id).filter(id => id !== user.userId)));
        const profileMap = new Map();

        if (senderIds.length > 0) {
          const profiles = await selectRows('profiles', {
            select: 'id,role,full_name',
            filters: [{ column: 'id', op: 'in', value: `(${senderIds.join(',')})` }],
            accessToken: token
          });
          profiles.forEach(p => profileMap.set(p.id, p));
        }

        const rows = messageRows.map(m => ({
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

      const senderIds = Array.from(new Set(messageRows.map(m => m.sender_id).filter(id => id !== user.userId)));
      const profileMap = new Map();

      if (senderIds.length > 0) {
        const profiles = await selectRows('profiles', {
          select: 'id,role,full_name',
          filters: [{ column: 'id', op: 'in', value: `(${senderIds.join(',')})` }],
          accessToken: token
        });
        profiles.forEach(p => profileMap.set(p.id, p));
      }

      const rows = messageRows.map(m => ({
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

  return (
    <div className="container section messages-page">
      <div className="messages-layout">
        <aside className="card conversation-list">
          <h2>{t('dashboard.conversations')}</h2>
          {loading ? <p className="muted">{t('dashboard.loadingDashboard')}</p> : null}
          {conversations.length === 0 && !loading ? (
            <p className="muted">{t('dashboard.noConversations')}</p>
          ) : null}

          {conversations.map((conversation) => (
            <Link
              key={conversation.id}
              to={`/messages/${conversation.id}`}
              className={`conversation-item ${conversation.id === threadId ? 'is-active' : ''}`}
              style={conversation.isAdmin ? { borderLeft: '4px solid #C0392B', backgroundColor: conversation.id === threadId ? '#FEF2F1' : '#FFF5F5' } : {}}
            >
              <strong style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: conversation.isAdmin ? '#C0392B' : 'inherit' }}>
                {conversation.isAdmin ? t('dashboard.adminLabel') : ''} {conversation.listing?.title || t('dashboard.listingConversation')}
              </strong>
              <span>{humanizeStatus(conversation.inquiry_status)} • {formatTimestamp(conversation.last_message_at)}</span>
            </Link>
          ))}
        </aside>

        <section className="card message-thread">
          {activeConversation ? (
            <>
              <header className="message-thread__header">
                <h2>{activeConversation.listing?.title || t('dashboard.listingConversation')}</h2>
                <p className="muted">
                  {t('dashboard.chatStatus')}: {humanizeStatus(activeConversation.inquiry_status)} • Chat:{' '}
                  {realtimeState === 'subscribed' ? t('dashboard.chatLive') : t('dashboard.chatConnecting')}
                </p>
                {canManageInquiryStatus ? (
                  <div className="message-thread__status-row">
                    <select
                      value={statusValue}
                      onChange={(event) => setStatusValue(event.target.value)}
                    >
                      {INQUIRY_STATUS_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {humanizeStatus(option)}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn--small"
                      onClick={updateInquiryStatus}
                      disabled={updatingStatus}
                    >
                      {updatingStatus ? t('dashboard.updating') : t('dashboard.updateInquiry')}
                    </button>
                  </div>
                ) : null}
              </header>

              <div className="message-list">
                {messages.map((message) => (
                  <article
                    key={message.id}
                    className={`message-bubble ${message.sender_id === user?.userId ? 'is-mine' : ''} ${message.senderProfile?.role === 'admin' ? 'is-admin' : ''}`}
                    style={message.senderProfile?.role === 'admin' && message.sender_id !== user?.userId ? { background: '#FEF2F1', border: '1px solid #F5C6C2', alignSelf: 'flex-start' } : {}}
                  >
                    {message.senderProfile?.role === 'admin' && message.sender_id !== user?.userId ? (
                      <strong style={{ display: 'block', fontSize: '0.75rem', color: '#C0392B', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {t('dashboard.campusStayAdmin')}
                      </strong>
                    ) : null}
                    <p>{message.body}</p>
                    <span>
                      {formatTimestamp(message.created_at)}
                      {message.sender_id === user?.userId
                        ? message.seen_at
                          ? ` • ${t('dashboard.seen')}`
                          : ` • ${t('dashboard.sent')}`
                        : ''}
                    </span>
                  </article>
                ))}
              </div>

              <form className="message-form" onSubmit={submitMessage}>
                <textarea
                  value={messageBody}
                  onChange={(event) => setMessageBody(event.target.value)}
                  placeholder={t('dashboard.writeMessage')}
                />
                <button className="btn" type="submit">
                  {t('dashboard.sendBtn')}
                </button>
              </form>
            </>
          ) : (
            <p className="muted">{t('dashboard.chooseConversation')}</p>
          )}
        </section>
      </div>

      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}
