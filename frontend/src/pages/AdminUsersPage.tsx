import React, { useState, useEffect } from 'react';
import { selectRows, updateRows } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Users, Download, Loader, ShieldX, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

interface Profile {
  id: string;
  full_name: string;
  phone: string;
  role: 'student' | 'lister' | 'admin';
  lister_type?: 'owner' | 'manager' | 'dalali';
  verification_status?: string;
  created_at: string;
}

export default function AdminUsersPage() {
  const { user: currentUser, token } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRole, setActiveRole] = useState('all');

  useEffect(() => {
    loadUsers();
  }, [activeRole, token]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => loadUsers(), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadUsers = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const filters: any[] = [];
      if (activeRole === 'tenants') {
        filters.push({ column: 'role', op: 'eq', value: 'student' });
      } else if (activeRole === 'landlords') {
        filters.push({ column: 'role', op: 'eq', value: 'lister' });
        filters.push({ column: 'lister_type', op: 'neq', value: 'dalali' });
      } else if (activeRole === 'dalalis') {
        filters.push({ column: 'role', op: 'eq', value: 'lister' });
        filters.push({ column: 'lister_type', op: 'eq', value: 'dalali' });
      } else if (activeRole === 'admins') {
        filters.push({ column: 'role', op: 'eq', value: 'admin' });
      }

      const data = await selectRows('profiles', {
        select: 'id,full_name,phone,role,lister_type,verification_status,created_at',
        filters: filters.length > 0 ? filters : undefined,
        or: searchQuery.trim()
          ? `full_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`
          : undefined,
        limit: 200,
        order: 'created_at.desc',
        accessToken: token,
      });
      setUsers(data as Profile[]);
    } catch (error) {
      toast.error('Failed to load users');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const suspendUser = async (userId: string) => {
    if (!token) return;
    try {
      await updateRows('profiles', { verification_status: 'suspended' }, {
        filters: [{ column: 'id', op: 'eq', value: userId }],
        accessToken: token,
      });
      setUsers(users.map(u => u.id === userId ? { ...u, verification_status: 'suspended' } : u));
      toast.success('User suspended');
    } catch {
      toast.error('Failed to suspend user');
    }
  };

  const unsuspendUser = async (userId: string) => {
    if (!token) return;
    try {
      await updateRows('profiles', { verification_status: 'unverified' }, {
        filters: [{ column: 'id', op: 'eq', value: userId }],
        accessToken: token,
      });
      setUsers(users.map(u => u.id === userId ? { ...u, verification_status: 'unverified' } : u));
      toast.success('User unsuspended');
    } catch {
      toast.error('Failed to unsuspend user');
    }
  };

  const exportCSV = () => {
    const headers = ['Name', 'Phone', 'Role', 'Verification', 'Suspended', 'Joined'];
    const rows = users.map(u => [
      u.full_name,
      u.phone,
      u.role,
      u.verification_status || 'n/a',
      u.verification_status === 'suspended' ? 'Yes' : 'No',
      new Date(u.created_at).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.success('User list exported');
  };

  const roleColors: Record<string, string> = {
    student: '#3b82f6',
    lister: '#8b5cf6',
    admin: '#ef4444',
  };

  const roleTabs = [
    { id: 'all', label: 'All Users' },
    { id: 'tenants', label: 'Tenants' },
    { id: 'landlords', label: 'Landlords' },
    { id: 'dalalis', label: 'Dalalis' },
    { id: 'admins', label: 'Admins' }
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.5rem' }}>All Users</h1>
          <p style={{ color: '#6b7280' }}>Manage platform users and accounts</p>
        </div>
        <button
          onClick={exportCSV}
          style={{ padding: '0.75rem 1.5rem', background: '#0d7a6e', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Download size={18} />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div style={{ background: '#f9fafb', padding: '1.25rem', borderRadius: '8px', marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search by name or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: '1 1 220px', padding: '0.65rem 1rem', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.95rem', fontFamily: 'inherit', minWidth: 180 }}
        />
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {roleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveRole(tab.id)}
              style={{ 
                padding: '0.5rem 1rem', 
                background: activeRole === tab.id ? '#0d7a6e' : '#fff', 
                color: activeRole === tab.id ? '#fff' : '#1f2937', 
                border: '1px solid #e5e7eb', 
                borderRadius: '6px', 
                cursor: 'pointer', 
                fontWeight: '600', 
                fontSize: '0.9rem' 
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          <Loader size={32} style={{ margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }} />
          Loading users...
        </div>
      )}

      {!isLoading && users.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', background: '#f9fafb', borderRadius: '8px', color: '#6b7280' }}>
          <Users size={32} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          No users found
        </div>
      )}

      {!isLoading && users.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['Name', 'Phone', 'Role', 'Verification', 'Status', 'Joined', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.85rem', color: '#6b7280', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, idx) => (
                <tr key={u.id} style={{ borderBottom: idx < users.length - 1 ? '1px solid #f3f4f6' : 'none', background: u.verification_status === 'suspended' ? '#fef9f9' : '#fff' }}>
                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.9rem', fontWeight: '600' }}>
                    {u.full_name || '—'}
                    {u.id === currentUser?.userId && <span style={{ marginLeft: '0.5rem', fontSize: '0.72rem', background: '#d1fae5', color: '#065f46', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>You</span>}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.9rem', color: '#6b7280' }}>{u.phone || '—'}</td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span style={{ background: roleColors[u.role] || '#6b7280', color: '#fff', fontSize: '0.75rem', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: '700', display: 'inline-block' }}>
                      {u.role === 'student' ? 'TENANT' : u.role === 'lister' ? (u.lister_type === 'dalali' ? 'DALALI' : 'LANDLORD') : u.role?.toUpperCase()}
                    </span>
                    {u.role === 'lister' && u.lister_type && (
                      <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '0.1rem', fontStyle: 'italic' }}>
                        {u.lister_type.charAt(0).toUpperCase() + u.lister_type.slice(1)}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: u.verification_status === 'verified' ? '#059669' : u.verification_status === 'pending' ? '#d97706' : '#6b7280' }}>
                    {u.verification_status || '—'}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span style={{ background: u.verification_status === 'suspended' ? '#fef2f2' : '#f0fdf4', color: u.verification_status === 'suspended' ? '#ef4444' : '#22c55e', fontSize: '0.78rem', padding: '0.25rem 0.55rem', borderRadius: '4px', fontWeight: '700', display: 'inline-block' }}>
                      {u.verification_status === 'suspended' ? 'SUSPENDED' : 'ACTIVE'}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: '#6b7280', whiteSpace: 'nowrap' }}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    {u.id !== currentUser?.userId && u.role !== 'admin' && (
                      u.verification_status === 'suspended' ? (
                        <button
                          onClick={() => unsuspendUser(u.id)}
                          title="Unsuspend"
                          style={{ padding: '0.35rem 0.7rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <ShieldCheck size={13} /> Unsuspend
                        </button>
                      ) : (
                        <button
                          onClick={() => suspendUser(u.id)}
                          title="Suspend"
                          style={{ padding: '0.35rem 0.7rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <ShieldX size={13} /> Suspend
                        </button>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ textAlign: 'right', fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.5rem' }}>
            Showing {users.length} user{users.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
