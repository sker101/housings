import { useEffect, useState } from 'react';
import { apiClient, extractErrorMessage } from '../api/client';

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState(null);
  const [pendingListings, setPendingListings] = useState([]);
  const [pendingLandlords, setPendingLandlords] = useState([]);
  const [flaggedListings, setFlaggedListings] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const [metricsRes, pendingListingsRes, pendingLandlordsRes, flaggedRes] = await Promise.all([
        apiClient.get('/admin/dashboard/metrics'),
        apiClient.get('/admin/listings/pending', { params: { page: 0, size: 20 } }),
        apiClient.get('/admin/landlords/pending', { params: { page: 0, size: 20 } }),
        apiClient.get('/admin/listings/flagged', { params: { page: 0, size: 20 } })
      ]);

      setMetrics(metricsRes.data);
      setPendingListings(pendingListingsRes.data.content || []);
      setPendingLandlords(pendingLandlordsRes.data.content || []);
      setFlaggedListings(flaggedRes.data.content || []);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const moderateListing = async (listingId, action) => {
    try {
      if (action === 'approve') {
        await apiClient.post(`/admin/listings/${listingId}/approve`);
      } else if (action === 'reject') {
        const reason = window.prompt('Provide rejection reason');
        if (!reason) return;
        await apiClient.post(`/admin/listings/${listingId}/reject`, { reason });
      } else if (action === 'flag') {
        const reason = window.prompt('Provide flag reason');
        if (!reason) return;
        await apiClient.post(`/admin/listings/${listingId}/flag`, { reason });
      } else if (action === 'unflag') {
        await apiClient.post(`/admin/listings/${listingId}/unflag`);
      }
      await loadDashboard();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  const moderateLandlord = async (userId, action) => {
    try {
      if (action === 'approve') {
        await apiClient.post(`/admin/landlords/${userId}/approve`);
      } else if (action === 'reject') {
        const reason = window.prompt('Provide rejection reason');
        if (!reason) return;
        await apiClient.post(`/admin/landlords/${userId}/reject`, { reason });
      } else {
        const reason = window.prompt('Provide suspension reason');
        if (!reason) return;
        await apiClient.post(`/admin/landlords/${userId}/suspend`, { reason });
      }
      await loadDashboard();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  return (
    <div className="container">
      <section className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <p>Verification and trust controls</p>
      </section>

      {loading ? <p>Loading dashboard...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {metrics ? (
        <section className="metric-grid">
          <article className="metric-card">
            <p>Total users</p>
            <strong>{metrics.totalUsers}</strong>
          </article>
          <article className="metric-card">
            <p>Total listings</p>
            <strong>{metrics.totalListings}</strong>
          </article>
          <article className="metric-card">
            <p>Pending approvals</p>
            <strong>{metrics.pendingApprovals}</strong>
          </article>
          <article className="metric-card">
            <p>Verified properties</p>
            <strong>{metrics.verifiedProperties}</strong>
          </article>
          <article className="metric-card">
            <p>Flagged listings</p>
            <strong>{metrics.flaggedListings}</strong>
          </article>
        </section>
      ) : null}

      <section className="card">
        <h2>Pending landlords</h2>
        {pendingLandlords.length === 0 ? <p>No pending landlords.</p> : null}
        {pendingLandlords.map((landlord) => (
          <article key={landlord.profileId} className="moderation-card">
            <div>
              <p>
                <strong>{landlord.fullName}</strong> ({landlord.email})
              </p>
              <p>Phone: {landlord.phone}</p>
              <p>ID placeholder: {landlord.identityDocumentPlaceholder}</p>
            </div>
            <div className="moderation-card__actions">
              <button className="btn" onClick={() => moderateLandlord(landlord.userId, 'approve')}>
                Approve
              </button>
              <button className="btn btn--secondary" onClick={() => moderateLandlord(landlord.userId, 'reject')}>
                Reject
              </button>
              <button className="btn btn--danger" onClick={() => moderateLandlord(landlord.userId, 'suspend')}>
                Suspend
              </button>
            </div>
          </article>
        ))}
      </section>

      <section className="card">
        <h2>Pending listings</h2>
        {pendingListings.length === 0 ? <p>No pending listings.</p> : null}
        {pendingListings.map((listing) => (
          <article key={listing.id} className="moderation-card">
            <div>
              <p>
                <strong>{listing.title}</strong> by {listing.landlordName}
              </p>
              <p>{listing.address}</p>
              <p>{new Intl.NumberFormat('en-TZ').format(Number(listing.rentAmount))} TZS / month</p>
            </div>
            <div className="moderation-card__actions">
              <button className="btn" onClick={() => moderateListing(listing.id, 'approve')}>
                Approve
              </button>
              <button className="btn btn--secondary" onClick={() => moderateListing(listing.id, 'reject')}>
                Reject
              </button>
              <button className="btn btn--danger" onClick={() => moderateListing(listing.id, 'flag')}>
                Flag
              </button>
            </div>
          </article>
        ))}
      </section>

      <section className="card">
        <h2>Flagged listings</h2>
        {flaggedListings.length === 0 ? <p>No flagged listings.</p> : null}
        {flaggedListings.map((listing) => (
          <article key={listing.id} className="moderation-card">
            <div>
              <p>
                <strong>{listing.title}</strong>
              </p>
              <p>{listing.address}</p>
              <p>Reason: {listing.flaggedReason || 'Not provided'}</p>
            </div>
            <div className="moderation-card__actions">
              <button className="btn" onClick={() => moderateListing(listing.id, 'unflag')}>
                Remove flag
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
