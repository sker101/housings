import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { MapPin, Calendar, Star, X, ChevronRight, LayoutDashboard, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchSavedListings } from '../lib/listings';
import { TZSFormat } from '../utils/format';

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

  const handleRemove = async (listingId) => {
    // TODO: Implement remove from saved functionality
    console.log('Remove listing:', listingId);
  };

  return (
    <div className="saved-page">
      <style>{savedPageStyles}</style>
      
      <header className="saved-header">
        <nav className="saved-breadcrumb">
          <Link to="/tenant/dashboard" className="saved-breadcrumb-item">
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </Link>
          <ChevronRight size={16} className="saved-breadcrumb-separator" />
          <span className="saved-breadcrumb-current">Saved Rooms</span>
        </nav>
      </header>

      {loading ? (
        <div className="saved-loading">
          <div className="room-skeleton">
            <div className="room-skeleton__image"></div>
            <div className="room-skeleton__text"></div>
            <div className="room-skeleton__text room-skeleton__text--short"></div>
          </div>
          <div className="room-skeleton">
            <div className="room-skeleton__image"></div>
            <div className="room-skeleton__text"></div>
            <div className="room-skeleton__text room-skeleton__text--short"></div>
          </div>
          <div className="room-skeleton">
            <div className="room-skeleton__image"></div>
            <div className="room-skeleton__text"></div>
            <div className="room-skeleton__text room-skeleton__text--short"></div>
          </div>
        </div>
      ) : error ? (
        <div className="saved-error">
          <p>{error}</p>
        </div>
      ) : items.length === 0 ? (
        <div className="saved-empty">
          <div className="saved-empty-icon">
            <Heart size={48} />
          </div>
          <h2 className="saved-empty-title">No saved rooms yet</h2>
          <p className="saved-empty-text">
            Start exploring and save your favorite rooms to view them here.
          </p>
          <Link to="/listings" className="saved-empty-btn">
            Browse Rooms
          </Link>
        </div>
      ) : (
        <div className="saved-grid">
          {items.map((item) => {
            const listing = item.listing;
            if (!listing) return null;
            
            return (
              <Link 
                key={listing.id} 
                to={`/rooms/${listing.id}`}
                className="saved-room-card"
              >
                <div className="saved-room-image">
                  {listing.imageUrl ? (
                    <img src={listing.imageUrl} alt={listing.title} />
                  ) : (
                    <div className="saved-room-placeholder">
                      <MapPin size={32} />
                    </div>
                  )}
                  <button 
                    className="saved-room-remove"
                    onClick={(e) => {
                      e.preventDefault();
                      handleRemove(listing.id);
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="saved-room-content">
                  <h3 className="saved-room-title">{listing.title}</h3>
                  <div className="saved-room-location">
                    <MapPin size={14} />
                    <span>{listing.location}</span>
                  </div>
                  <div className="saved-room-details">
                    <div className="saved-room-detail">
                      <Calendar size={14} />
                      <span>{listing.roomType || 'Private room'}</span>
                    </div>
                    {listing.rating && (
                      <div className="saved-room-detail">
                        <Star size={14} fill="#f59e0b" color="#f59e0b" />
                        <span>{listing.rating}</span>
                      </div>
                    )}
                  </div>
                  <div className="saved-room-price">
                    <span className="saved-room-price-value">
                      {TZSFormat(listing.priceMonthly)}
                    </span>
                    <span className="saved-room-price-unit">/month</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

const savedPageStyles = `
  .saved-page {
    min-height: 100vh;
    background: #f8fafc;
    padding: 1rem;
  }

  .saved-header {
    background: white;
    border-radius: 12px;
    padding: 1rem 1.25rem;
    margin-bottom: 1.25rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  }

  .saved-breadcrumb {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
  }

  .saved-breadcrumb-item {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    color: #64748b;
    text-decoration: none;
    transition: color 0.2s ease;
  }

  .saved-breadcrumb-item:active {
    color: #22c55e;
  }

  .saved-breadcrumb-separator {
    color: #cbd5e1;
  }

  .saved-breadcrumb-current {
    color: #1e293b;
    font-weight: 600;
  }

  .saved-loading {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 1rem;
    padding: 0.5rem;
  }

  .room-skeleton {
    display: grid;
    gap: 0.5rem;
  }

  .room-skeleton__image {
    aspect-ratio: 1 / 1;
    border-radius: 12px;
    background: linear-gradient(90deg, var(--cream) 25%, #e8e8e8 50%, var(--cream) 75%);
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s infinite;
  }

  .room-skeleton__text {
    height: 14px;
    border-radius: 4px;
    background: linear-gradient(90deg, var(--cream) 25%, #e8e8e8 50%, var(--cream) 75%);
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s infinite;
  }

  .room-skeleton__text--short {
    width: 60%;
  }

  @keyframes skeleton-shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  .saved-error {
    text-align: center;
    padding: 3rem 1rem;
    color: #ef4444;
  }

  .saved-empty {
    text-align: center;
    padding: 4rem 1rem;
  }

  .saved-empty-icon {
    width: 80px;
    height: 80px;
    margin: 0 auto 1.5rem;
    background: linear-gradient(135deg, #e5e7eb, #d1d5db);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #6b7280;
  }

  .saved-empty-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0 0 0.75rem 0;
  }

  .saved-empty-text {
    font-size: 0.95rem;
    color: #64748b;
    margin: 0 0 1.5rem 0;
    max-width: 300px;
    margin-left: auto;
    margin-right: auto;
  }

  .saved-empty-btn {
    display: inline-block;
    background: linear-gradient(135deg, #22c55e, #16a34a);
    color: white;
    padding: 0.75rem 2rem;
    border-radius: 12px;
    font-weight: 600;
    text-decoration: none;
    transition: all 0.2s ease;
  }

  .saved-empty-btn:active {
    transform: scale(0.96);
  }

  .saved-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 1rem;
    padding: 0.5rem;
  }

  .saved-room-card {
    background: white;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    text-decoration: none;
    transition: all 0.2s ease;
    display: grid;
    gap: 0.5rem;
  }

  .saved-room-card:active {
    transform: scale(0.96);
  }

  .saved-room-image {
    position: relative;
    aspect-ratio: 1 / 1;
    border-radius: 12px;
    overflow: hidden;
    background: #f1f5f9;
  }

  .saved-room-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .saved-room-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #94a3b8;
  }

  .saved-room-remove {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    width: 28px;
    height: 28px;
    background: rgba(255, 255, 255, 0.95);
    border: none;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #64748b;
    transition: all 0.2s ease;
  }

  .saved-room-remove:active {
    transform: scale(0.9);
    background: #fee2e2;
    color: #ef4444;
  }

  .saved-room-content {
    padding: 0.5rem;
    display: grid;
    gap: 0.35rem;
  }

  .saved-room-title {
    font-size: 0.85rem;
    font-weight: 600;
    color: #1e293b;
    margin: 0;
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .saved-room-location {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    color: #64748b;
  }

  .saved-room-details {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.75rem;
    color: #64748b;
  }

  .saved-room-detail {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .saved-room-price {
    display: flex;
    align-items: baseline;
    gap: 0.15rem;
    margin-top: 0.25rem;
  }

  .saved-room-price-value {
    font-size: 0.9rem;
    font-weight: 700;
    color: #22c55e;
  }

  .saved-room-price-unit {
    font-size: 0.75rem;
    color: #64748b;
  }

  @media (min-width: 640px) {
    .saved-grid {
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    }
  }

  @media (min-width: 1024px) {
    .saved-page {
      padding: 2rem;
    }

    .saved-grid {
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 1.5rem;
    }
  }
`;
