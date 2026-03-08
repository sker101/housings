import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ListingCard from '../components/ListingCard';
import { useAuth } from '../context/AuthContext';
import { fetchSavedListings, toggleSavedListing } from '../lib/listings';

export default function SavedListingsPage() {
  const { user, token } = useAuth();
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadSaved() {
      if (!user?.userId || !token) {
        setItems([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const rows = await fetchSavedListings(user.userId, token);
        if (mounted) {
          setItems(rows);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message);
          setItems([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadSaved();

    return () => {
      mounted = false;
    };
  }, [user?.userId, token]);

  const handleToggleSave = async (listingId) => {
    if (!user?.userId || !token) {
      return;
    }

    try {
      await toggleSavedListing({
        tenantId: user.userId,
        listingId,
        accessToken: token
      });

      setItems((prev) => prev.filter((item) => item.listing.id !== listingId));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="container section">
      <div className="section__header">
        <div>
          <h1>{t('dashboard.savedListings')}</h1>
          <p>{t('dashboard.savedListingsSubtitle')}</p>
        </div>
      </div>

      {loading ? <p className="muted">{t('dashboard.loadingSaved')}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {items.length === 0 && !loading ? (
        <section className="card">
          <p>{t('dashboard.noSavedListings')}</p>
        </section>
      ) : null}

      <div className="listing-grid">
        {items.map((item) => (
          <ListingCard
            key={item.listing.id}
            listing={item.listing}
            onToggleSave={handleToggleSave}
            isSaved
          />
        ))}
      </div>
    </div>
  );
}
