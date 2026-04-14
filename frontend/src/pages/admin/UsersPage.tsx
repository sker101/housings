import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Users, CheckCircle, ShieldX, RefreshCw, Shield, Search,
  GraduationCap, Home, Handshake, ShieldCheck,
} from 'lucide-react';
import { SkeletonCard } from '../../components/SkeletonCard';
import { StatusPill } from '../../components/StatusPill';
import { useAuth } from '../../context/AuthContext';
import { selectRows, updateRows, insertRows, SUPABASE_URL, SUPABASE_ANON_KEY } from '../../lib/supabase';
import { formatDate, friendlyError } from '../../utils/format';
import type { Profile } from '../../types';
import toast from 'react-hot-toast';

type AdminProfile = Profile & { email?: string };

type RoleTab = 'all' | 'student' | 'landlord' | 'dalali' | 'admin';

const TABS: { key: RoleTab; label: string; icon: React.ReactNode }[] = [
  { key: 'all',      label: 'All',      icon: <Users size={14} /> },
  { key: 'student',  label: 'Tenants',  icon: <GraduationCap size={14} /> },
  { key: 'landlord', label: 'Landlords',icon: <Home size={14} /> },
  { key: 'dalali',   label: 'Dalalis',  icon: <Handshake size={14} /> },
  { key: 'admin',    label: 'Admins',   icon: <ShieldCheck size={14} /> },
];

export default function AdminUsersPage() {
  const { user: me, token } = useAuth();
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<RoleTab>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const loadProfiles = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const rows = await selectRows('profiles', {
        select: 'id,role,lister_type,full_name,phone,phone_verified,verification_status,subscription_plan,created_at',
        order: 'created_at.desc',
        limit: 500,
        accessToken: token,
      });
      setProfiles(rows as AdminProfile[]);
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadProfiles(); }, [loadProfiles]);

  // ── Realtime ────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    const wsUrl = `${SUPABASE_URL.replace('https://', 'wss://').replace('http://', 'ws://')}/realtime/v1/websocket?apikey=${SUPABASE_ANON_KEY}&vsn=1.0.0`;
    let ws: WebSocket;
    let heartbeatId: ReturnType<typeof setInterval>;
    let ref = 1;
    try {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onopen = () => {
        ws.send(JSON.stringify({ topic: 'realtime:public:profiles', event: 'phx_join', payload: { config: { postgres_changes: [{ event: '*', schema: 'public', table: 'profiles' }] }, access_token: token }, ref: String(ref++) }));
        heartbeatId = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: String(ref++) }));
        }, 30_000);
      };
      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data as string);
          if (msg.event === 'postgres_changes') {
            const { type, record } = msg.payload?.data ?? {};
            if (type === 'UPDATE' && record?.id) setProfiles((prev) => prev.map((p) => p.id === record.id ? { ...p, ...record } : p));
            if (type === 'INSERT' && record?.id) setProfiles((prev) => [record as AdminProfile, ...prev]);
          }
        } catch { /* ignore */ }
      };
    } catch { /* WebSocket not available */ }
    return () => {
      clearInterval(heartbeatId);
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    };
  }, [token]);

  // ── Actions ───────────────────────────────────────────────────
  const logAdminAction = async (action: string, targetId: string, metadata: Record<string, unknown> = {}) => {
    if (!token || !me?.userId) return;
    await insertRows('admin_audit_log', {
      admin_id: me.userId, action, target_type: 'profile', target_id: targetId,
      metadata, created_at: new Date().toISOString(),
    }, { accessToken: token }).catch(() => {});
  };

  const optimisticUpdate = async (id: string, patch: Partial<AdminProfile>, action: string, successMsg: string) => {
    const prev = profiles.find((p) => p.id === id);
    if (!prev || !token) return;
    setBusyId(id);
    setProfiles((ps) => ps.map((p) => p.id === id ? { ...p, ...patch } : p));
    try {
      await updateRows('profiles', patch, { filters: [{ column: 'id', op: 'eq', value: id }], accessToken: token });
      await logAdminAction(action, id, { before: prev, after: { ...prev, ...patch } });
      toast.success(successMsg);
    } catch (err) {
      setProfiles((ps) => ps.map((p) => p.id === id ? prev : p));
      toast.error(friendlyError(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleVerifyId  = (id: string) => optimisticUpdate(id, { verification_status: 'verified' } as any,  'verify_id',  'ID verified');
  const handleSuspend   = (id: string) => optimisticUpdate(id, { verification_status: 'suspended' } as any,    'suspend',    'Account suspended');
  const handleUnsuspend = (id: string) => optimisticUpdate(id, { verification_status: 'unverified' } as any,   'unsuspend',  'Account reinstated');
  // ── Filtering ────────────────────────────────────────────────
  const counts: Record<RoleTab, number> = {
    all:      profiles.length,
    student:  profiles.filter((p) => p.role === 'student').length,
    landlord: profiles.filter((p) => p.role === 'lister' && p.lister_type !== 'dalali').length,
    dalali:   profiles.filter((p) => p.role === 'lister' && p.lister_type === 'dalali').length,
    admin:    profiles.filter((p) => p.role === 'admin').length,
  };

  const filtered = profiles.filter((p) => {
    const matchTab =
      activeTab === 'all' ||
      (activeTab === 'student'  && p.role === 'student') ||
      (activeTab === 'landlord' && p.role === 'lister' && p.lister_type !== 'dalali') ||
      (activeTab === 'dalali'   && p.role === 'lister' && p.lister_type === 'dalali') ||
      (activeTab === 'admin'    && p.role === 'admin');
    
    const q = search.trim().toLowerCase();
    const matchSearch = !q || p.full_name?.toLowerCase().includes(q) || p.phone?.toLowerCase().includes(q);
    return matchTab && matchSearch;
  });

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--mid)' }} />
          <input
            type="text"
            placeholder="Search by name or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2.2rem', width: '100%' }}
          />
        </div>
        <button className="btn btn--ghost btn--small" onClick={loadProfiles} title="Refresh" style={{ flexShrink: 0 }}>
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Role Tabs */}
      <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.38rem 0.75rem',
                borderRadius: 99,
                border: isActive ? '2px solid var(--jade)' : '1px solid var(--border)',
                background: isActive ? 'var(--jade-muted, #e8f8f2)' : 'var(--surface)',
                color: isActive ? 'var(--jade)' : 'var(--mid)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {tab.icon}
              {tab.label}
              <span style={{
                background: isActive ? 'var(--jade)' : 'var(--border)',
                color: isActive ? '#fff' : 'var(--mid)',
                borderRadius: 99,
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '0 0.4rem',
                lineHeight: '1.5',
              }}>
                {counts[tab.key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display: 'grid', gap: '0.5rem' }}><SkeletonCard variant="row" count={8} /></div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14 }}>
          <Users size={36} style={{ color: 'var(--mid)', marginBottom: '0.75rem' }} />
          <p style={{ color: 'var(--mid)' }}>No users found in this category.</p>
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem', minWidth: 680 }}>
            <thead>
              <tr style={{ background: 'var(--cream)' }}>
                {['Name', 'Phone', 'Role', 'ID', 'Status', 'Joined', 'Actions'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '0.55rem 0.75rem', fontWeight: 700, color: 'var(--mid)', fontSize: '0.72rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={p.id} style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none', opacity: busyId === p.id ? 0.6 : 1 }}>
                  <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>{p.full_name || '—'}</td>
                  <td style={{ padding: '0.6rem 0.75rem', color: 'var(--mid)' }}>{p.phone || '—'}</td>
                  <td style={{ padding: '0.6rem 0.75rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--jade)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      {p.role === 'student' ? 'Tenant' : p.role === 'admin' ? 'Admin' : (p.lister_type === 'dalali' ? 'Dalali' : 'Landlord')}
                    </div>
                    {p.role === 'lister' && p.lister_type && (
                      <div style={{ fontSize: '0.65rem', color: 'var(--mid)', textTransform: 'capitalize' }}>
                        {p.lister_type}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem' }}>
                    <StatusPill variant={p.verification_status === 'verified' ? 'verified' : 'unverified'} size="sm" />
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem' }}>
                    <StatusPill variant={p.verification_status === 'suspended' ? 'suspended' : 'active'} size="sm" />
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem', color: 'var(--mid)', whiteSpace: 'nowrap' }}>{formatDate(p.created_at)}</td>
                  <td style={{ padding: '0.6rem 0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      {p.verification_status !== 'verified' && p.verification_status !== 'suspended' && (
                        <button onClick={() => handleVerifyId(p.id)} disabled={busyId === p.id} title="Verify ID"
                          style={{ background: 'var(--jade-muted)', border: 'none', borderRadius: 6, padding: '0.3rem 0.5rem', cursor: 'pointer', color: 'var(--jade)' }}>
                          <CheckCircle size={13} />
                        </button>
                      )}
                      {p.verification_status === 'suspended' ? (
                        <button onClick={() => handleUnsuspend(p.id)} disabled={busyId === p.id} title="Reinstate"
                          style={{ background: 'var(--jade-muted)', border: 'none', borderRadius: 6, padding: '0.3rem 0.5rem', cursor: 'pointer', color: 'var(--jade)' }}>
                          <Shield size={13} />
                        </button>
                      ) : (
                        <button onClick={() => handleSuspend(p.id)} disabled={busyId === p.id || p.role === 'admin'} title="Suspend"
                          style={{ background: 'var(--red-light)', border: 'none', borderRadius: 6, padding: '0.3rem 0.5rem', cursor: 'pointer', color: 'var(--red)', opacity: p.role === 'admin' ? 0.4 : 1 }}>
                          <ShieldX size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--mid)' }}>
        Showing {filtered.length} of {profiles.length} users · Updates in real-time
      </p>
    </>
  );
}
