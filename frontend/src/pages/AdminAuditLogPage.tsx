import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { selectRows } from '../lib/supabase';

function formatTimestamp(value) {
  if (!value) {
    return '-';
  }

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function AdminAuditLogPage() {
  const { token } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [targetFilter, setTargetFilter] = useState('all');
  const [adminFilter, setAdminFilter] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadLogs() {
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const rows = await selectRows('admin_audit_log', {
          select: 'id,admin_id,action,target_table,target_id,reason,created_at',
          order: 'created_at.desc',
          limit: 200,
          accessToken: token
        });

        if (mounted) {
          setLogs(rows);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message);
          setLogs([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadLogs();

    return () => {
      mounted = false;
    };
  }, [token]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (actionFilter !== 'all' && log.action !== actionFilter) {
        return false;
      }

      if (targetFilter !== 'all' && log.target_table !== targetFilter) {
        return false;
      }

      if (adminFilter.trim()) {
        return String(log.admin_id || '')
          .toLowerCase()
          .includes(adminFilter.trim().toLowerCase());
      }

      return true;
    });
  }, [logs, actionFilter, targetFilter, adminFilter]);

  const actionOptions = useMemo(() => {
    return ['all', ...new Set(logs.map((log) => log.action).filter(Boolean))];
  }, [logs]);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="container" style={{ padding: isMobile ? '1rem' : '2rem', paddingBottom: '5rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: isMobile ? '1.5rem' : '2rem', margin: 0 }}>Admin Audit Log</h1>
        <p style={{ color: 'var(--mid)', marginTop: '0.25rem' }}>Chronological record of moderation actions.</p>
      </div>

      {loading && <p className="muted" style={{ textAlign: 'center', padding: '2rem' }}>Loading audit log...</p>}
      {error && <p className="error-text" style={{ padding: '1rem', background: '#fee2e2', borderRadius: 8, color: '#b91c1c' }}>{error}</p>}

      <section style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '0.75rem', 
        marginBottom: '1.5rem',
        background: 'var(--surface)',
        padding: '1rem',
        borderRadius: 14,
        border: '1px solid var(--border)'
      }}>
        <select value={actionFilter} onChange={(event) => setActionFilter(event.target.value)} style={{ width: '100%' }}>
          {actionOptions.map((action) => (
            <option key={action} value={action}>
              {action === 'all' ? 'All actions' : action}
            </option>
          ))}
        </select>

        <select value={targetFilter} onChange={(event) => setTargetFilter(event.target.value)} style={{ width: '100%' }}>
          <option value="all">All targets</option>
          <option value="landlord">Landlord</option>
          <option value="listing">Listing</option>
        </select>

        <input
          type="search"
          placeholder="Filter by admin ID"
          value={adminFilter}
          onChange={(event) => setAdminFilter(event.target.value)}
          style={{ width: '100%' }}
        />
      </section>

      {!loading && !error && (
        <section>
          {isMobile ? (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {filteredLogs.map((log) => (
                <div key={log.id} style={{ 
                  background: 'var(--surface)', 
                  border: '1px solid var(--border)', 
                  borderRadius: 14, 
                  padding: '1rem',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: 'var(--jade)', fontSize: '0.75rem', textTransform: 'uppercase' }}>{log.action}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--mid)' }}>{formatTimestamp(log.created_at)}</span>
                  </div>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--mid)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Target</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{log.target_table} ({log.target_id})</span>
                  </div>
                  {log.reason && (
                    <div style={{ padding: '0.5rem', background: '#f9fafb', borderRadius: 8 }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--mid)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Reason</span>
                      <p style={{ margin: 0, fontSize: '0.85rem' }}>{log.reason}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="card" style={{ overflow: 'auto', borderRadius: 14, border: '1px solid var(--border)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--cream)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>Time</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>Action</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>Target</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>Target ID</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.75rem' }}>{formatTimestamp(log.created_at)}</td>
                      <td style={{ padding: '0.75rem', fontWeight: 600 }}>{log.action}</td>
                      <td style={{ padding: '0.75rem' }}>{log.target_table}</td>
                      <td style={{ padding: '0.75rem', fontSize: '0.8rem', color: 'var(--mid)' }}>{log.target_id}</td>
                      <td style={{ padding: '0.75rem' }}>{log.reason || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filteredLogs.length === 0 && (
            <p className="muted" style={{ textAlign: 'center', padding: '3rem' }}>No audit entries yet.</p>
          )}
        </section>
      )}
    </div>
  );
}
