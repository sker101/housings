import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { insertRows, selectRows, updateRows } from '../lib/supabase';

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

export default function MessagesPage() {
  const navigate = useNavigate();
  const { threadId } = useParams();
  const { user, token } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messageBody, setMessageBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === threadId) || null,
    [conversations, threadId]
  );

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

        const merged = rows.map((row) => ({
          ...row,
          listing: listingMap.get(row.listing_id) || null
        }));

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

    const intervalId = setInterval(loadConversations, 7000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
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

        const rows = await selectRows('messages', {
          select: 'id,conversation_id,sender_id,body,seen_at,created_at',
          filters: [{ column: 'conversation_id', op: 'eq', value: threadId }],
          order: 'created_at.asc',
          accessToken: token
        });

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

    const intervalId = setInterval(loadMessages, 4000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
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

      await updateRows(
        'conversations',
        { last_message_at: new Date().toISOString() },
        {
          filters: [{ column: 'id', op: 'eq', value: threadId }],
          accessToken: token
        }
      );

      setMessageBody('');

      const rows = await selectRows('messages', {
        select: 'id,conversation_id,sender_id,body,seen_at,created_at',
        filters: [{ column: 'conversation_id', op: 'eq', value: threadId }],
        order: 'created_at.asc',
        accessToken: token
      });
      setMessages(rows);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="container section messages-page">
      <div className="messages-layout">
        <aside className="card conversation-list">
          <h2>Conversations</h2>
          {loading ? <p className="muted">Loading...</p> : null}
          {conversations.length === 0 && !loading ? (
            <p className="muted">No conversations yet.</p>
          ) : null}

          {conversations.map((conversation) => (
            <Link
              key={conversation.id}
              to={`/messages/${conversation.id}`}
              className={`conversation-item ${conversation.id === threadId ? 'is-active' : ''}`}
            >
              <strong>{conversation.listing?.title || 'Listing conversation'}</strong>
              <span>{formatTimestamp(conversation.last_message_at)}</span>
            </Link>
          ))}
        </aside>

        <section className="card message-thread">
          {activeConversation ? (
            <>
              <header className="message-thread__header">
                <h2>{activeConversation.listing?.title || 'Conversation'}</h2>
                <p className="muted">Status: {activeConversation.inquiry_status || 'open'}</p>
              </header>

              <div className="message-list">
                {messages.map((message) => (
                  <article
                    key={message.id}
                    className={`message-bubble ${message.sender_id === user?.userId ? 'is-mine' : ''}`}
                  >
                    <p>{message.body}</p>
                    <span>
                      {formatTimestamp(message.created_at)}
                      {message.sender_id === user?.userId
                        ? message.seen_at
                          ? ' • Seen'
                          : ' • Sent'
                        : ''}
                    </span>
                  </article>
                ))}
              </div>

              <form className="message-form" onSubmit={submitMessage}>
                <textarea
                  value={messageBody}
                  onChange={(event) => setMessageBody(event.target.value)}
                  placeholder="Write a message"
                />
                <button className="btn" type="submit">
                  Send
                </button>
              </form>
            </>
          ) : (
            <p className="muted">Choose a conversation to start chatting.</p>
          )}
        </section>
      </div>

      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}
