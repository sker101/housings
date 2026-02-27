import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { countRows } from '../lib/supabase';

export default function AdminDashboardPage() {
  const { token } = useAuth();
  const [metrics, setMetrics] = useState({
    totalListings: 0,
    pendingListings: 0,
    flaggedListings: 0,
    signupsToday: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadMetrics() {
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const todayIso = new Date();
        todayIso.setHours(0, 0, 0, 0);
        const startOfDay = todayIso.toISOString();

        const [totalListings, pendingListings, flaggedListings, signupsToday] = await Promise.all([
          countRows('listings', { accessToken: token }),
          countRows('listings', {
            filters: [{ column: 'status', op: 'eq', value: 'pending' }],
            accessToken: token
          }),
          countRows('listings', {
            filters: [{ column: 'status', op: 'eq', value: 'flagged' }],
            accessToken: token
          }),
          countRows('profiles', {
            filters: [{ column: 'created_at', op: 'gte', value: startOfDay }],
            accessToken: token
          })
        ]);

        if (mounted) {
          setMetrics({
            totalListings,
            pendingListings,
            flaggedListings,
            signupsToday
          });
        }
      } catch (err) {
        if (mounted) {
          setError(err.message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadMetrics();

    return () => {
      mounted = false;
    };
  }, [token]);

  return (
    <div className="container section">
      <div className="section__header">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Moderation queues, metrics, and audit tracking.</p>
        </div>
      </div>

      {loading ? <p className="muted">Loading metrics...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      <section className="metric-grid">
        <article className="metric-card">
          <p>Total listings</p>
          <strong>{metrics.totalListings}</strong>
          <span className="muted">Across all statuses</span>
        </article>

        <article className="metric-card">
          <p>Pending queue</p>
          <strong>{metrics.pendingListings}</strong>
          <span className="muted">Needs moderation</span>
          <Link to="/admin/landlords" className="btn btn--small">
            Review listers
          </Link>
        </article>

        <article className="metric-card">
          <p>Flagged listings</p>
          <strong>{metrics.flaggedListings}</strong>
          <span className="muted">Potential trust issues</span>
          <Link to="/admin/listings" className="btn btn--small">
            Open listings
          </Link>
        </article>

        <article className="metric-card">
          <p>New signups today</p>
          <strong>{metrics.signupsToday}</strong>
          <span className="muted">Profiles created since midnight</span>
          <Link to="/admin/landlords" className="btn btn--small btn--ghost">
            Open queue
          </Link>
        </article>

        <article className="metric-card">
          <p>Audit log</p>
          <strong>Review admin action history</strong>
          <Link to="/admin/audit-log" className="btn btn--small">
            Open audit log
          </Link>
        </article>
      </section>
    </div>
  );
}
