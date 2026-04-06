import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  LayoutDashboard, Users, List, DollarSign, Flag,
  CheckCircle, ShieldX, RefreshCw, Shield, Search, AlertTriangle,
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { SkeletonCard } from '../../components/SkeletonCard';
import { StatusPill } from '../../components/StatusPill';
import { RoleBadge } from '../../components/RoleBadge';
import { useAuth } from '../../context/AuthContext';
import { selectRows, updateRows, insertRows, SUPABASE_URL, SUPABASE_ANON_KEY } from '../../lib/supabase';
import { formatDate, friendlyError } from '../../utils/format';
import type { Profile, NavItem, Role } from '../../types';
import toast from 'react-hot-toast';

const NAV: NavItem[] = [
  { label: 'Dashboard', href: '/admin',           icon: <LayoutDashboard size={16} /> },
  { label: 'Users',     href: '/admin/users',     icon: <Users size={16} /> },
  { label: 'Listings',  href: '/admin/listings',  icon: <List size={16} /> },
  { label: 'Payments',  href: '/admin/payments',  icon: <DollarSign size={16} /> },
  { label: 'Disputes',  href: '/admin/disputes',  icon: <Flag size={16} /> },
];

type AdminProfile = Profile & { email?: string };

export default function AdminUsersPage() {
  const { user: me, token } = useAuth();
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const loadProfiles = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const rows = await selectRows('profiles', {
        select: 'id,role,full_name,phone,id_verified,suspended,avg_rating,created_at',
        order: 'created_at.desc',
        limit: 200,
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

  // ── Realtime: live profile updates ───────────────────────────
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
            if (type === 'UPDATE' && record?.id) {
              setProfiles((prev) => prev.map((p) => p.id === record.id ? { ...p, ...record } : p));
            }
            if (type === 'INSERT' && record?.id) {
              setProfiles((prev) => [record as AdminProfile, ...prev]);
            }
          }
        } catch { /* ignore */ }
      };
    } catch { /* WebSocket not available */ }

    return () => {
      clearInterval(heartbeatId);
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    };
  }, [token]);

  // ── Optimistic actions ────────────────────────────────────────
  const logAdminAction = async (action: string, targetId: string, metadata: Record<string, unknown> = {}) => {
    if (!token || !me?.userId) return;
    await insertRows('admin_audit_log', {
      admin_id: me.userId, action, target_type: 'profile', target_id: targetId,
      metadata, created_at: new Date().toISOString(),
    }, { accessToken: token }).catch(() => {/* log failure is non-blocking */});
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
      setProfiles((ps) => ps.map((p) => p.id === id ? prev : p)); // revert
      toast.error(friendlyError(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleVerifyId     = (id: string) => optimisticUpdate(id, { id_verified: true },  'verify_id',    'ID verified');
  const handleSuspend      = (id: string) => optimisticUpdate(id, { suspended: true },    'suspend',      'Account suspended');
  const handleUnsuspend    = (id: string) => optimisticUpdate(id, { suspended: false },   'unsuspend',    'Account reinstated');

  const changeRole = async (id: string, newRole: Role) => {
    await optimisticUpdate(id, { role: newRole } as Partial<AdminProfile>, 'change_role', `Role changed to ${newRole}`);
  };

  const filtered = profiles.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.full_name?.toLowerCase().includes(q) ||
      p.phone?.toLowerCase().includes(q) ||
      p.role?.toLowerCase().includes(q)
    );
  });

  return (
    <DashboardLayout role="admin" accentColor="var(--red)" navItems={NAV} pageTitle="Users">
      {/* Search + refresh */}
      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--mid)' }} />
          <input
            type="text"
            placeholder="Search by name, phone or role…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2.2rem' }}
          />
        </div>
        <button className="btn btn--ghost btn--small" onClick={loadProfiles} title="Refresh" style={{ flexShrink: 0 }}>
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display: 'grid', gap: '0.5rem' }}><SkeletonCard variant="row" count={8} /></div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14 }}>
          <Users size={36} style={{ color: 'var(--mid)', marginBottom: '0.75rem' }} />
          <p style={{ color: 'var(--mid)' }}>No users found.</p>
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem', minWidth: 700 }}>
            <thead>
              <tr style={{ background: 'var(--cream)' }}>
                {['Name', 'Phone', 'Role', 'ID Verified', 'Status', 'Joined', 'Actions'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '0.55rem 0.75rem', fontWeight: 700, color: 'var(--mid)', fontSize: '0.73rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={p.id} style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none', opacity: busyId === p.id ? 0.6 : 1 }}>
                  <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>{p.full_name || '—'}</td>
                  <td style={{ padding: '0.6rem 0.75rem', color: 'var(--mid)' }}>{p.phone || '—'}</td>
                  <td style={{ padding: '0.6rem 0.75rem' }}>
                    <select
                      value={p.role}
                      disabled={busyId === p.id}
                      onChange={(e) => changeRole(p.id, e.target.value as Role)}
                      style={{ fontSize: '0.8rem', padding: '0.2rem 0.4rem', borderRadius: 6, border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', width: 'auto' }}
                    >
                      {(['student', 'landlord', 'dalali', 'admin'] as Role[]).map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem' }}>
                    <StatusPill variant={p.id_verified ? 'verified' : 'unverified'} size="sm" />
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem' }}>
                    <StatusPill variant={p.suspended ? 'suspended' : 'active'} size="sm" />
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem', color: 'var(--mid)', whiteSpace: 'nowrap' }}>{formatDate(p.created_at)}</td>
                  <td style={{ padding: '0.6rem 0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'nowrap' }}>
                      {!p.id_verified && (
                        <button
                          onClick={() => handleVerifyId(p.id)}
                          disabled={busyId === p.id}
                          title="Verify ID"
                          style={{ background: 'var(--jade-muted)', border: 'none', borderRadius: 6, padding: '0.3rem 0.5rem', cursor: 'pointer', color: 'var(--jade)' }}
                        >
                          <CheckCircle size={13} />
                        </button>
                      )}
                      {p.suspended ? (
                        <button
                          onClick={() => handleUnsuspend(p.id)}
                          disabled={busyId === p.id}
                          title="Reinstate"
                          style={{ background: 'var(--jade-muted)', border: 'none', borderRadius: 6, padding: '0.3rem 0.5rem', cursor: 'pointer', color: 'var(--jade)' }}
                        >
                          <Shield size={13} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSuspend(p.id)}
                          disabled={busyId === p.id || p.role === 'admin'}
                          title="Suspend"
                          style={{ background: 'var(--red-light)', border: 'none', borderRadius: 6, padding: '0.3rem 0.5rem', cursor: 'pointer', color: 'var(--red)', opacity: p.role === 'admin' ? 0.4 : 1 }}
                        >
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
    </DashboardLayout>
  );
}
