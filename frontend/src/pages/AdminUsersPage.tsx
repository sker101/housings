import React, { useState, useEffect } from 'react';
import { selectRows, updateRows } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Users, Download, Loader, AlertCircle, Eye, ShieldX } from 'lucide-react';
import toast from 'react-hot-toast';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: 'student' | 'dalali' | 'landlord' | 'admin';
  university?: string;
  status: 'active' | 'suspended' | 'pending';
  created_at: string;
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRole, setActiveRole] = useState('all');
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);

  useEffect(() => {
    loadUsers();
  }, [activeRole, searchQuery]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      let filters: string[] = [];

      if (activeRole !== 'all') {
        filters.push(`role.eq.${activeRole}`);
      }

      if (searchQuery.trim()) {
        filters.push(`or(full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%)`);
      }

      const data = await selectRows('profiles', {
        filters,
        limit: 100,
        order: 'created_at.desc'
      });
      setUsers(data);
    } catch (error) {
      toast.error('Failed to load users');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const suspendUser = async (userId: string) => {
    try {
      await updateRows('profiles', { status: 'suspended' }, {
        filters: [`id.eq.${userId}`]
      });

      setUsers(users.map(u => u.id === userId ? { ...u, status: 'suspended' } : u));
      toast.success('User suspended');
    } catch (error) {
      toast.error('Failed to suspend user');
    }
  };

  const unsuspendUser = async (userId: string) => {
    try {
      await updateRows('profiles', { status: 'active' }, {
        filters: [`id.eq.${userId}`]
      });

      setUsers(users.map(u => u.id === userId ? { ...u, status: 'active' } : u));
      toast.success('User unsuspended');
    } catch (error) {
      toast.error('Failed to unsuspend user');
    }
  };

  const exportCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Role', 'Status', 'Joined'];
    const rows = users.map(u => [
      u.full_name,
      u.email,
      u.phone,
      u.role,
      u.status,
      new Date(u.created_at).toLocaleDateString()
    ]);

    const csv = [headers, ...rows].map(row =>
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

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
    dalali: '#8b5cf6',
    landlord: '#ec4899',
    admin: '#ef4444'
  };

  const statusColors: Record<string, string> = {
    active: '#10b981',
    suspended: '#ef4444',
    pending: '#f59e0b'
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.5rem' }}>All Users</h1>
          <p style={{ color: '#6b7280' }}>Manage platform users and accounts</p>
        </div>
        <button
          onClick={exportCSV}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#0d7a6e',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Download size={18} />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div style={{
        background: '#f9fafb',
        padding: '1.5rem',
        borderRadius: '8px',
        marginBottom: '2rem',
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: '1 1 250px', minWidth: '200px' }}>
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '0.95rem',
              fontFamily: 'inherit'
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {['all', 'student', 'dalali', 'landlord'].map((role) => (
            <button
              key={role}
              onClick={() => setActiveRole(role)}
              style={{
                padding: '0.5rem 1rem',
                background: activeRole === role ? '#0d7a6e' : '#fff',
                color: activeRole === role ? '#fff' : '#1f2937',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.9rem'
              }}
            >
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          <Loader size={32} style={{ margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }} />
          Loading users...
        </div>
      )}

      {/* Empty State */}
      {!isLoading && users.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          background: '#f9fafb',
          borderRadius: '8px',
          color: '#6b7280'
        }}>
          <Users size={32} style={{ margin: '0 auto 1rem', opacity: '0.5' }} />
          No users found
        </div>
      )}

      {/* Users Table */}
      {!isLoading && users.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            background: '#fff',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid #e5e7eb'
          }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.9rem', color: '#6b7280' }}>Name</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.9rem', color: '#6b7280' }}>Email</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.9rem', color: '#6b7280' }}>Phone</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.9rem', color: '#6b7280' }}>Role</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.9rem', color: '#6b7280' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.9rem', color: '#6b7280' }}>Joined</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.9rem', color: '#6b7280' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, idx) => (
                <tr key={u.id} style={{
                  borderBottom: idx < users.length - 1 ? '1px solid #f3f4f6' : 'none'
                }}>
                  <td style={{ padding: '1rem', fontSize: '0.9rem', fontWeight: '500' }}>{u.full_name}</td>
                  <td style={{ padding: '1rem', fontSize: '0.9rem', color: '#6b7280' }}>{u.email}</td>
                  <td style={{ padding: '1rem', fontSize: '0.9rem', color: '#6b7280' }}>{u.phone}</td>
                  <td style={{ padding: '1rem', fontSize: '0.9rem' }}>
                    <span style={{
                      background: roleColors[u.role],
                      color: '#fff',
                      fontSize: '0.75rem',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontWeight: '600',
                      display: 'inline-block'
                    }}>
                      {u.role.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.9rem' }}>
                    <span style={{
                      background: statusColors[u.status],
                      color: '#fff',
                      fontSize: '0.75rem',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontWeight: '600',
                      display: 'inline-block'
                    }}>
                      {u.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.9rem', color: '#6b7280' }}>
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.9rem', display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => setSelectedUser(u)}
                      style={{
                        padding: '0.4rem 0.8rem',
                        background: '#f3f4f6',
                        border: '1px solid #e5e7eb',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: '600'
                      }}
                    >
                      <Eye size={14} style={{ display: 'inline-block' }} />
                    </button>
                    {u.status === 'active' ? (
                      <button
                        onClick={() => suspendUser(u.id)}
                        style={{
                          padding: '0.4rem 0.8rem',
                          background: '#ef4444',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: '600'
                        }}
                      >
                        <ShieldX size={14} style={{ display: 'inline-block' }} />
                      </button>
                    ) : (
                      <button
                        onClick={() => unsuspendUser(u.id)}
                        style={{
                          padding: '0.4rem 0.8rem',
                          background: '#10b981',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: '600'
                        }}
                      >
                        Unsuspend
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
