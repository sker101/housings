import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient, extractErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function LandlordDashboardPage() {
  const { user, refreshMe } = useAuth();
  const [profile, setProfile] = useState(null);
  const [listings, setListings] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [profileRes, listingsRes] = await Promise.all([
        apiClient.get('/landlord/profile'),
        apiClient.get('/landlord/listings/mine', { params: { page: 0, size: 20 } })
      ]);

      setProfile(profileRes.data);
      setListings(listingsRes.data.content || []);
      await refreshMe();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const isApproved = profile?.verificationStatus === 'APPROVED';

  return (
    <div className="container">
      <section className="dashboard-header">
        <h1>Landlord Dashboard</h1>
        <p>{user?.fullName}</p>
      </section>

      {loading ? <p>Loading dashboard...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {profile ? (
        <section className="card">
          <h2>Verification status</h2>
          <p>
            Status: <strong>{profile.verificationStatus}</strong>
          </p>
          <p>ID placeholder: {profile.identityDocumentPlaceholder}</p>
          {profile.reviewNotes ? <p>Admin note: {profile.reviewNotes}</p> : null}

          <div className="list-property-cta-actions">
            <Link to="/list-property" className="btn">
              List New Property
            </Link>
            {!isApproved ? (
              <p className="warning-text">Admin approval is required before submitting properties.</p>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="card">
        <h2>Your listings</h2>
        {listings.length === 0 ? <p>No listings yet.</p> : null}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Verified</th>
                <th>Rent</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((listing) => (
                <tr key={listing.id}>
                  <td>{listing.title}</td>
                  <td>{listing.listingStatus}</td>
                  <td>{listing.verified ? 'Yes' : 'No'}</td>
                  <td>{new Intl.NumberFormat('en-TZ').format(Number(listing.rentAmount))} TZS</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
