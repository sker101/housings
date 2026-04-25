import { useEffect, useMemo, useState, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MessageCircle, Inbox, Send, ArrowLeft, MoreVertical, Phone, Video, Check, CheckCheck, MapPin, Home, User, Building2, Shield, LayoutDashboard, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { subscribeToTableChanges } from '../lib/realtime';
import { insertRows, selectRows, updateRows } from '../lib/supabase';
import { sanitizeInput } from '../utils/format';

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
            'chat_messages',
            { is_read: true },
            {
              filters: [
                { column: 'inquiry_id', op: 'eq', value: threadId },
                { column: 'sender_id', op: 'neq', value: user.userId },
                { column: 'is_read', op: 'eq', value: 'false' }
              ],
              accessToken: token
            }
          ).catch(() => {});
        }

        const messageRows = await selectRows('chat_messages', {
          select: 'id,inquiry_id,sender_id,body,is_read,created_at',
          filters: [{ column: 'inquiry_id', op: 'eq', value: threadId }],
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
     
  }, [threadId, token, user?.userId]);

  const submitMessage = async (event) => {
    event.preventDefault();

    if (!threadId || !messageBody.trim() || !user?.userId || !token) {
      return;
    }

    try {
      await insertRows(
        'chat_messages',
        {
          inquiry_id: threadId,
          sender_id: user.userId,
          body: sanitizeInput(messageBody)
        },
        { accessToken: token }
      );

      setMessageBody('');

      const messageRows = await selectRows('chat_messages', {
        select: 'id,inquiry_id,sender_id,body,is_read,created_at',
        filters: [{ column: 'inquiry_id', op: 'eq', value: threadId }],
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
        'room_inquiries',
        { status: statusValue },
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Update failed';
      setError(message);
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
        .msg-shell{display:flex;height:calc(100vh - 80px);min-height:600px;background:#f1f5f9;margin:0;overflow:hidden}
        @media(min-width:768px){.msg-shell{margin:1rem;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);border:1px solid #e2e8f0}}
        
        /* Mobile Back Button */
        .mobile-back-btn{display:flex;align-items:center;gap:6px;padding:8px 14px;margin-right:12px;border:1px solid #e2e8f0;border-radius:10px;background:white;font-size:13px;font-weight:600;color:#475569;cursor:pointer;transition:all 0.2s}
        .mobile-back-btn:hover{background:#f8fafc;border-color:#22c55e;color:#22c55e}
        @media(min-width:768px){.mobile-back-btn{display:none}}
        
        /* Sidebar */
        .conv-sidebar{width:100%;flex-shrink:0;display:flex;flex-direction:column;background:white;border-right:1px solid #e2e8f0}
        @media(min-width:768px){.conv-sidebar{width:360px}}
        @media(min-width:1024px){.conv-sidebar{width:400px}}
        .conv-sidebar-hdr{padding:20px 24px;border-bottom:1px solid #e2e8f0;background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%);border-radius:16px 16px 0 0}
        .conv-sidebar-title{font-size:18px;font-weight:700;color:white;margin:0;display:flex;align-items:center;gap:10px}
        .conv-sidebar-sub{font-size:13px;color:rgba(255,255,255,0.9);margin-top:6px;font-weight:500}
        .conv-list{flex:1;overflow-y:auto;padding:12px}
        
        /* Conversation Items */
        .conv-item{padding:16px;margin:6px 0;border-radius:14px;cursor:pointer;display:flex;gap:14px;align-items:flex-start;text-decoration:none;transition:all 0.2s;border:1px solid transparent;background:white;box-shadow:0 1px 3px rgba(0,0,0,0.04)}
        .conv-item:hover{background:#f0fdf4;border-color:#86efac;transform:translateY(-1px);box-shadow:0 4px 12px rgba(34,197,94,0.12)}
        .conv-item.is-active{background:linear-gradient(135deg,#dcfce7 0%,#bbf7d0 100%);border-color:#22c55e;box-shadow:0 4px 16px rgba(34,197,94,0.2)}
        .conv-item.is-admin{background:linear-gradient(135deg,#fef2f2 0%,#fee2e2 100%);border-color:#fecaca}
        .conv-item.is-admin:hover{background:#fecaca}
        .conv-item.is-admin.is-active{background:linear-gradient(135deg,#fecaca 0%,#fca5a5 100%);border-color:#ef4444}
        .conv-av{width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%);color:white;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;flex-shrink:0;box-shadow:0 2px 8px rgba(34,197,94,0.25)}
        .conv-av.admin{background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);box-shadow:0 2px 8px rgba(239,68,68,0.25)}
        .conv-info{flex:1;min-width:0}
        .conv-name{font-size:15px;font-weight:600;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin:0;display:flex;align-items:center;gap:6px}
        .conv-name.admin{color:#991b1b}
        .conv-preview{font-size:13px;color:#64748b;margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.4}
        .conv-item.is-active .conv-preview{color:#15803d}
        .conv-meta{display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0}
        .conv-time{font-size:12px;color:#94a3b8;font-weight:500}
        .conv-item.is-active .conv-time{color:#22c55e;font-weight:600}
        .unread-badge{min-width:20px;height:20px;border-radius:10px;background:#22c55e;color:white;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 6px}
        .unread-badge.admin{background:#ef4444}
        .status-pill{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600;text-transform:capitalize}
        .sp-open{background:#fef3c7;color:#92400e}
        .sp-interested{background:#dcfce7;color:#166534}
        .sp-booked{background:#dbeafe;color:#1e40af}
        .sp-unavailable{background:#f1f5f9;color:#64748b}
        
        /* Thread Area */
        .thread{flex:1;display:flex;flex-direction:column;background:#f8fafc;min-width:0}
        .thread{position:fixed;top:0;left:0;right:0;bottom:0;z-index:50;background:white}
        @media(min-width:768px){.thread{position:static}}
        .thread:not(.thread-active){display:none}
        @media(min-width:768px){.thread:not(.thread-active){display:flex}}
        
        /* Empty Thread State */
        .empty-thread{display:flex;align-items:center;justify-content:center;height:100%;background:linear-gradient(180deg,#f8fafc 0%,#f1f5f9 100%)}
        .empty-thread-content{text-align:center;padding:40px}
        .empty-thread-icon{width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;box-shadow:0 8px 24px rgba(34,197,94,0.25)}
        .empty-thread-title{font-size:18px;font-weight:700;color:#1e293b;margin:0 0 8px}
        .empty-thread-sub{font-size:14px;color:#64748b;margin:0}
        
        /* Thread Header */
        .thread-hdr{padding:16px 20px;border-bottom:1px solid #e2e8f0;background:white;display:flex;align-items:center;gap:12px;box-shadow:0 1px 4px rgba(0,0,0,0.04)}
        .thread-hdr-info{flex:1;min-width:0}
        .thread-title{font-size:16px;font-weight:700;color:#1e293b;margin:0;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .thread-sub{display:flex;align-items:center;gap:12px;margin-top:4px;font-size:12px;color:#64748b}
        .thread-status{display:flex;align-items:center;gap:6px;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;background:#f1f5f9;color:#64748b}
        .thread-status.live{background:#dcfce7;color:#166534}
        .live-dot{width:6px;height:6px;border-radius:50%;background:#22c55e;animation:pulse 2s infinite}
        .thread-actions{display:flex;gap:8px}
        .thread-btn{padding:8px;border-radius:10px;border:1px solid #e2e8f0;background:white;color:#64748b;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:center}
        .thread-btn:hover{background:#f8fafc;border-color:#22c55e;color:#22c55e}
        
        /* Status Management */
        .status-row{display:flex;align-items:center;gap:8px;margin-left:auto}
        .status-select{padding:8px 12px;border-radius:8px;border:1px solid #e2e8f0;background:white;font-size:13px;color:#475569;outline:none;cursor:pointer;font-weight:500}
        .status-select:focus{border-color:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,0.1)}
        .status-upd-btn{padding:8px 16px;border-radius:8px;border:none;background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%);color:white;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s;box-shadow:0 2px 8px rgba(34,197,94,0.3)}
        .status-upd-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 4px 12px rgba(34,197,94,0.4)}
        .status-upd-btn:disabled{opacity:0.6;cursor:not-allowed}
        
        /* Message List */
        .msg-list{flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:16px;background:linear-gradient(180deg,#f8fafc 0%,#f0fdf4 100%)}
        
        /* Message Bubbles */
        .bubble{max-width:80%;padding:12px 16px;border-radius:16px;position:relative;animation:bubblePop 0.3s ease-out;font-size:14px;line-height:1.6;word-wrap:break-word;box-shadow:0 2px 8px rgba(0,0,0,0.06)}
        
        /* My Messages */
        .bubble.mine{align-self:flex-end;background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%);color:white;border-bottom-right-radius:4px}
        .bubble.mine .bubble-sender{color:rgba(255,255,255,0.85)}
        .bubble.mine .bubble-text{color:white}
        .bubble.mine .bubble-time{color:rgba(255,255,255,0.75)}
        
        /* Their Messages */
        .bubble.theirs{align-self:flex-start;background:white;color:#1e293b;border:1px solid #e2e8f0;border-bottom-left-radius:4px}
        .bubble.theirs .bubble-sender{color:#64748b}
        .bubble.theirs .bubble-text{color:#1e293b}
        .bubble.theirs .bubble-time{color:#94a3b8}
        
        /* Admin Messages */
        .bubble.is-admin{align-self:flex-start;background:linear-gradient(135deg,#fef3c7 0%,#fde68a 100%);color:#92400e;border:1px solid #fcd34d;border-bottom-left-radius:4px}
        .bubble.is-admin .bubble-sender{color:#b45309;font-weight:700}
        .bubble.is-admin .bubble-text{color:#78350f}
        .bubble.is-admin .bubble-time{color:#b45309}
        
        .bubble-sender{font-size:12px;font-weight:600;margin-bottom:4px;display:flex;align-items:center;gap:6px}
        .bubble-sender-icon{width:16px;height:16px;border-radius:50%;background:rgba(0,0,0,0.1);display:flex;align-items:center;justify-content:center}
        .bubble-text{margin:0;font-size:14px;line-height:1.6}
        .bubble-footer{display:flex;align-items:center;gap:6px;margin-top:8px}
        .bubble-time{font-size:11px;font-weight:500}
        .bubble-status{display:flex;align-items:center}
        
        /* Compose Area */
        .compose{padding:16px 20px;background:white;border-top:1px solid #e2e8f0;display:flex;gap:12px;align-items:flex-end;box-shadow:0 -2px 10px rgba(0,0,0,0.03)}
        .compose-input-wrapper{flex:1;position:relative}
        .compose textarea{width:100%;padding:12px 16px;border:2px solid #e2e8f0;border-radius:12px;font-size:14px;resize:none;min-height:48px;max-height:120px;font-family:inherit;transition:all 0.2s;background:#f8fafc;line-height:1.5}
        .compose textarea:focus{outline:none;border-color:#22c55e;background:white;box-shadow:0 0 0 4px rgba(34,197,94,0.1)}
        .compose textarea::placeholder{color:#94a3b8}
        
        /* Send Button */
        .send-btn{padding:12px 20px;background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%);color:white;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;transition:all 0.2s;box-shadow:0 4px 12px rgba(34,197,94,0.3);display:flex;align-items:center;gap:8px;flex-shrink:0}
        .send-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 20px rgba(34,197,94,0.4)}
        .send-btn:disabled{opacity:0.5;cursor:not-allowed;transform:none;background:#94a3b8}
        
        /* Loading Skeleton */
        .conv-skeleton{padding:16px;margin:6px 0;border-radius:14px;background:#f1f5f9;animation:pulse 1.5s ease-in-out infinite;height:76px}
        
        /* Mobile View Handling */
        @media(max-width:767px){
          .conv-sidebar{width:100%}
          .conv-sidebar.thread-active{display:none}
        }
      `}</style>

      {/* Breadcrumb Header */}
      <header style={{background:'white',borderRadius:'12px',padding:'1rem 1.25rem',margin:'1rem 1rem 0',boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
        <nav style={{display:'flex',alignItems:'center',gap:'0.5rem',fontSize:'0.9rem'}}>
          <Link to="/tenant/dashboard" style={{display:'flex',alignItems:'center',gap:'0.35rem',color:'#64748b',textDecoration:'none'}}>
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </Link>
          <ChevronRight size={16} style={{color:'#cbd5e1'}} />
          <span style={{color:'#1e293b',fontWeight:600}}>Messages</span>
        </nav>
      </header>

        <div className="msg-shell" style={{margin:'1rem',height:'calc(100vh - 180px)'}}>
          {/* Sidebar */}
          <div className={`conv-sidebar${threadId ? ' thread-active' : ''}`}>
            <div className="conv-sidebar-hdr">
              <p className="conv-sidebar-title">
                <MessageCircle size={22} />
                Messages
              </p>
              <p className="conv-sidebar-sub">
                {conversations.length} {conversations.length === 1 ? 'conversation' : 'conversations'}
              </p>
            </div>
            <div className="conv-list">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={`conv-skel-${i}`} className="conv-skeleton" />
                ))
              ) : conversations.length === 0 ? (
                <div className="empty-thread">
                  <div className="empty-thread-content">
                    <div className="empty-thread-icon">
                      <Inbox size={36} color="white" />
                    </div>
                    <h3 className="empty-thread-title">No conversations yet</h3>
                    <p className="empty-thread-sub">Start by inquiring about a property</p>
                  </div>
                </div>
              ) : (
                conversations.map((conv: any) => {
                  const isActive = conv.id === threadId;
                  const displayName = conv.isAdmin
                    ? 'iRent Admin'
                    : conv.otherProfile?.full_name || 'Property Owner';
                  const isUuid = conv.listing?.title && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(conv.listing?.title);
                  const preview = conv.listing?.title && !isUuid
                    ? conv.listing?.title
                    : humanizeStatus(conv.inquiry_status);
                  const statusClass = conv.inquiry_status || 'open';
                  const convClasses = [
                    'conv-item',
                    isActive ? 'is-active' : '',
                    conv.isAdmin ? 'is-admin' : ''
                  ].filter(Boolean).join(' ');
                  const initials = (conv.otherProfile?.full_name || (conv.isAdmin ? 'AD' : 'PO'))
                    .split(/\s+/)
                    .map((n: string) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <Link key={conv.id} to={`/messages/${conv.id}`} className={convClasses}>
                      <div className={`conv-av${conv.isAdmin ? ' admin' : ''}`}>{initials}</div>
                      <div className="conv-info">
                        <p className={`conv-name${conv.isAdmin ? ' admin' : ''}`}>
                          {displayName}
                          {conv.isAdmin && <Shield size={14} color="#ef4444" />}
                        </p>
                        <p className="conv-preview">{preview}</p>
                      </div>
                      <div className="conv-meta">
                        <span className="conv-time">{formatListTime(conv.last_message_at)}</span>
                        <span className={`status-pill sp-${statusClass}`}>
                          {humanizeStatus(conv.inquiry_status)}
                        </span>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>

        <div className={`thread${threadId ? ' thread-active' : ''}`}>
          {!activeConversation ? (
            <div className="empty-thread">
              <div className="empty-thread-content">
                <div className="empty-thread-icon">
                  <MessageCircle size={36} color="white" />
                </div>
                <h3 className="empty-thread-title">Select a conversation</h3>
                <p className="empty-thread-sub">Choose a chat from the sidebar to start messaging</p>
              </div>
            </div>
          ) : (
            <>
              <div className="thread-hdr">
                <button type="button" className="mobile-back-btn" onClick={() => navigate('/messages')} aria-label="Back">
                  <ArrowLeft size={16} />
                  Back
                </button>
                <div className="thread-hdr-info">
                  <p className="thread-title">
                    {(() => {
                      const isUuid = activeConversation.listing?.title && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeConversation.listing?.title);
                      return activeConversation.listing?.title && !isUuid
                        ? activeConversation.listing?.title
                        : 'Property Inquiry';
                    })()}
                  </p>
                  <div className="thread-sub">
                    <span className={`thread-status ${realtimeState === 'subscribed' ? 'live' : ''}`}>
                      <span className="live-dot" style={realtimeState === 'subscribed' ? {} : { background: '#94a3b8', animation: 'none' }} />
                      {realtimeState === 'subscribed' ? 'Online' : 'Connecting...'}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <User size={12} />
                      {activeConversation.otherProfile?.full_name || 'Unknown'}
                    </span>
                  </div>
                </div>
                {canManageInquiryStatus ? (
                  <div className="status-row">
                    <select 
                      className="status-select" 
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
                      className="status-upd-btn"
                      onClick={updateInquiryStatus}
                      disabled={updatingStatus}
                    >
                      {updatingStatus ? 'Saving...' : 'Update'}
                    </button>
                  </div>
                ) : (
                  <div className="status-row">
                    <span className={`status-pill sp-${activeConversation.inquiry_status || 'open'}`}>
                      {humanizeStatus(activeConversation.inquiry_status)}
                    </span>
                  </div>
                )}
              </div>

              <div className="msg-list">
                {messages.map((m: any) => {
                  const mine = m.sender_id === user?.userId;
                  const adminMsg = m.senderProfile?.role === 'admin' && !mine;
                  const bubbleClass = [
                    'bubble',
                    mine ? 'mine' : 'theirs',
                    adminMsg ? 'is-admin' : ''
                  ].filter(Boolean).join(' ');

                  return (
                    <div key={m.id} className={bubbleClass}>
                      {adminMsg ? (
                        <p className="bubble-sender">
                          <Shield size={12} />
                          iRent Admin
                        </p>
                      ) : null}
                      {!mine && !adminMsg && m.senderProfile?.full_name ? (
                        <p className="bubble-sender">
                          <User size={12} />
                          {m.senderProfile.full_name}
                        </p>
                      ) : null}
                      <p className="bubble-text">{sanitizeMessage(m.body)}</p>
                      <div className="bubble-footer">
                        <span className="bubble-time">{formatTimestamp(m.created_at)}</span>
                        {mine && (
                          <span className="bubble-status">
                            {m.seen_at ? <CheckCheck size={14} /> : <Check size={14} />}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <form className="compose" onSubmit={submitMessage}>
                <div className="compose-input-wrapper">
                  <textarea
                    value={messageBody}
                    onChange={(event) => setMessageBody(event.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        submitMessage(e);
                      }
                    }}
                    placeholder={t('dashboard.writeMessage') || 'Type a message...'}
                    rows={1}
                  />
                </div>
                <button className="send-btn" type="submit" disabled={!messageBody.trim()}>
                  <Send size={18} />
                  Send
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
