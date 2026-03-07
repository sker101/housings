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
          select: 'id,admin_id,action,target_type,target_id,reason,created_at',
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

      if (targetFilter !== 'all' && log.target_type !== targetFilter) {
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

  return (
    <div className="container section">
      <div className="section__header">
        <div>
          <h1>Admin Audit Log</h1>
          <p>Chronological record of moderation actions.</p>
        </div>
      </div>

      {loading ? <p className="muted">Loading audit log...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      <section className="card filter-drawer">
        <select value={actionFilter} onChange={(event) => setActionFilter(event.target.value)}>
          {actionOptions.map((action) => (
            <option key={action} value={action}>
              {action === 'all' ? 'All actions' : action}
            </option>
          ))}
        </select>

        <select value={targetFilter} onChange={(event) => setTargetFilter(event.target.value)}>
          <option value="all">All targets</option>
          <option value="landlord">Landlord</option>
          <option value="listing">Listing</option>
        </select>

        <input
          type="search"
          placeholder="Filter by admin ID"
          value={adminFilter}
          onChange={(event) => setAdminFilter(event.target.value)}
        />
      </section>

      <section className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Action</th>
              <th>Target</th>
              <th>Target ID</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log) => (
              <tr key={log.id}>
                <td>{formatTimestamp(log.created_at)}</td>
                <td>{log.action}</td>
                <td>{log.target_type}</td>
                <td>{log.target_id}</td>
                <td>{log.reason || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredLogs.length === 0 && !loading ? (
          <p className="muted">No audit entries yet.</p>
        ) : null}
      </section>
    </div>
  );
}
