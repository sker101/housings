import React, { useState, useEffect } from 'react';
import { selectRows, countRows } from '../lib/supabase';
import { BookOpen, Download, Filter, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string;
  metadata?: any;
  created_at: string;
  ip_address?: string;
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [filterAction, setFilterAction] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  useEffect(() => {
    loadLogs();
    loadCount();
  }, [page, filterAction, filterStartDate, filterEndDate]);

  const loadCount = async () => {
    try {
      const filters: string[] = [];
      if (filterAction) filters.push(`action.ilike.%${filterAction}%`);
      if (filterStartDate) filters.push(`created_at.gte.${filterStartDate}T00:00:00Z`);
      if (filterEndDate) filters.push(`created_at.lte.${filterEndDate}T23:59:59Z`);

      const query = filters.length > 0 ? `or(${filters.join(',')})` : undefined;
      const count = await countRows('admin_audit_log', {
        filters: query ? [query] : undefined
      });
      setTotalCount(count);
    } catch (error) {
      console.error('Failed to load count:', error);
    }
  };

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const filters: string[] = [];
      if (filterAction) filters.push(`action.ilike.%${filterAction}%`);
      if (filterStartDate) filters.push(`created_at.gte.${filterStartDate}T00:00:00Z`);
      if (filterEndDate) filters.push(`created_at.lte.${filterEndDate}T23:59:59Z`);

      const data = await selectRows('admin_audit_log', {
        filters,
        order: 'created_at.desc',
        limit: pageSize,
        offset: page * pageSize,
        select: '*'
      });
      setLogs(data);
    } catch (error) {
      toast.error('Failed to load audit logs');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportCSV = () => {
    const headers = ['Timestamp', 'Admin ID', 'Action', 'Target Type', 'Target ID', 'Metadata'];
    const rows = logs.map(log => [
      new Date(log.created_at).toISOString(),
      log.admin_id,
      log.action,
      log.target_type,
      log.target_id,
      JSON.stringify(log.metadata || {})
    ]);

    const csv = [headers, ...rows].map(row =>
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast.success('Audit log exported');
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.5rem' }}>Audit Log</h1>
          <p style={{ color: '#6b7280' }}>Track all admin actions and system changes</p>
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
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1rem'
      }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.5rem', color: '#6b7280' }}>
            Action Filter
          </label>
          <input
            type="text"
            value={filterAction}
            onChange={(e) => { setFilterAction(e.target.value); setPage(0); }}
            placeholder="e.g., suspend_account"
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '0.95rem',
              fontFamily: 'inherit'
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.5rem', color: '#6b7280' }}>
            Start Date
          </label>
          <input
            type="date"
            value={filterStartDate}
            onChange={(e) => { setFilterStartDate(e.target.value); setPage(0); }}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '0.95rem',
              fontFamily: 'inherit'
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.5rem', color: '#6b7280' }}>
            End Date
          </label>
          <input
            type="date"
            value={filterEndDate}
            onChange={(e) => { setFilterEndDate(e.target.value); setPage(0); }}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '0.95rem',
              fontFamily: 'inherit'
            }}
          />
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          <Loader size={32} style={{ margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }} />
          Loading audit logs...
        </div>
      )}

      {/* Table */}
      {!isLoading && logs.length > 0 && (
        <div style={{ overflowX: 'auto', marginBottom: '2rem' }}>
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
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.9rem', color: '#6b7280' }}>Timestamp</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.9rem', color: '#6b7280' }}>Action</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.9rem', color: '#6b7280' }}>Target</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.9rem', color: '#6b7280' }}>Admin ID</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, idx) => (
                <tr key={log.id} style={{
                  borderBottom: idx < logs.length - 1 ? '1px solid #f3f4f6' : 'none'
                }}>
                  <td style={{ padding: '1rem', fontSize: '0.9rem' }}>
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.9rem', fontFamily: 'monospace', color: '#0d7a6e' }}>
                    {log.action}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.9rem' }}>
                    <span style={{ color: '#6b7280' }}>{log.target_type}:</span> {log.target_id?.slice(0, 8)}...
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.9rem', fontFamily: 'monospace', color: '#6b7280' }}>
                    {log.admin_id?.slice(0, 8)}...
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && logs.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          background: '#f9fafb',
          borderRadius: '8px',
          color: '#6b7280'
        }}>
          <BookOpen size={32} style={{ margin: '0 auto 1rem', opacity: '0.5' }} />
          No audit logs found
        </div>
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '1rem',
          paddingTop: '2rem',
          borderTop: '1px solid #e5e7eb'
        }}>
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            style={{
              padding: '0.5rem 1rem',
              background: page === 0 ? '#f3f4f6' : '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              cursor: page === 0 ? 'not-allowed' : 'pointer',
              opacity: page === 0 ? '0.5' : '1'
            }}
          >
            Previous
          </button>
          <span style={{ color: '#6b7280', fontWeight: '600' }}>
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page === totalPages - 1}
            style={{
              padding: '0.5rem 1rem',
              background: page === totalPages - 1 ? '#f3f4f6' : '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              cursor: page === totalPages - 1 ? 'not-allowed' : 'pointer',
              opacity: page === totalPages - 1 ? '0.5' : '1'
            }}
          >
            Next
          </button>
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
