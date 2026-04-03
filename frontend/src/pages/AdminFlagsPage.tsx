import React, { useState, useEffect } from 'react';
import { selectRows, updateRows, insertRows, countRows } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle, X, Eye, Trash2, AlertCircle, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

interface ContentFlag {
  id: string;
  listing_id: string;
  reported_by: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'cleared';
  created_at: string;
  flagged_by_system: boolean;
}

interface Listing {
  id: string;
  title: string;
  description: string;
}

export default function AdminFlagsPage() {
  const { user } = useAuth();
  const [flags, setFlags] = useState<ContentFlag[]>([]);
  const [listingCache, setListingCache] = useState<Record<string, Listing>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    loadFlags();
    loadCounts();
  }, [filter]);

  const loadCounts = async () => {
    try {
      const count = await countRows('content_flags', { filters: [{ column: 'status', op: 'eq', value: 'pending' }] });
      setPendingCount(count);
    } catch (error) {
      console.error('Failed to load count:', error);
    }
  };

  const loadFlags = async () => {
    setIsLoading(true);
    try {
      const data = await selectRows('content_flags', {
        filters: [{ column: 'status', op: 'eq', value: filter }],
        order: 'created_at.desc'
      });
      setFlags(data);

      // Pre-load listing data
      const listingIds = [...new Set(data.map(f => f.listing_id))];
      const listings = await selectRows('listings', {
        filters: [{ column: 'id', op: 'in', value: `(${listingIds.join(',')})` }]
      });

      const cache: Record<string, Listing> = {};
      listings.forEach((l: Listing) => {
        cache[l.id] = l;
      });
      setListingCache(cache);
    } catch (error) {
      toast.error('Failed to load flags');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearFlag = async (flagId: string) => {
    try {
      await updateRows('content_flags', { status: 'cleared' }, {
        filters: [{ column: 'id', op: 'eq', value: flagId }]
      });

      await insertRows('admin_audit_log', {
        admin_id: user?.id,
        action: 'clear_flag',
        target_type: 'flag',
        target_id: flagId
      });

      toast.success('Flag cleared');
      loadFlags();
      loadCounts();
    } catch (error) {
      toast.error('Failed to clear flag');
    }
  };

  const takeDownListing = async (listingId: string, flagId: string) => {
    try {
      await updateRows('listings', { status: 'taken_down' }, {
        filters: [{ column: 'id', op: 'eq', value: listingId }]
      });

      await updateRows('content_flags', { status: 'reviewed' }, {
        filters: [{ column: 'id', op: 'eq', value: flagId }]
      });

      await insertRows('admin_audit_log', {
        admin_id: user?.id,
        action: 'takedown_listing',
        target_type: 'listing',
        target_id: listingId,
        metadata: { flag_id: flagId }
      });

      toast.success('Listing taken down');
      loadFlags();
      loadCounts();
    } catch (error) {
      toast.error('Failed to take down listing');
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.5rem' }}>Flagged Content</h1>
        <p style={{ color: '#6b7280' }}>Review and manage user-reported and auto-flagged listings</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        {['pending', 'reviewed', 'cleared'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            style={{
              padding: '0.5rem 1rem',
              background: filter === status ? '#0d7a6e' : '#f3f4f6',
              color: filter === status ? '#fff' : '#1f2937',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.9rem'
            }}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          <Loader size={32} style={{ margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }} />
          Loading flagged content...
        </div>
      )}

      {/* Empty State */}
      {!isLoading && flags.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          background: '#f9fafb',
          borderRadius: '8px',
          color: '#6b7280'
        }}>
          <AlertCircle size={32} style={{ margin: '0 auto 1rem', opacity: '0.5' }} />
          No flagged content in this category
        </div>
      )}

      {/* Flags Grid */}
      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {flags.map((flag) => {
          const listing = listingCache[flag.listing_id];
          return (
            <div
              key={flag.id}
              style={{
                background: flag.flagged_by_system ? '#fef3c7' : '#fff',
                border: flag.flagged_by_system ? '2px solid #f59e0b' : '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '1.5rem'
              }}
            >
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    {flag.flagged_by_system && (
                      <span style={{
                        background: '#f59e0b',
                        color: '#fff',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '4px',
                        textTransform: 'uppercase'
                      }}>
                        Auto-Flagged
                      </span>
                    )}
                    <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                      {new Date(flag.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {listing && (
                    <div style={{ marginBottom: '1rem' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                        {listing.title}
                      </h3>
                      <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>
                        ID: {flag.listing_id.slice(0, 8)}...
                      </p>
                    </div>
                  )}

                  <div>
                    <p style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.25rem' }}>Reason:</p>
                    <p style={{ color: '#6b7280' }}>{flag.reason}</p>
                  </div>
                </div>

                {/* Actions */}
                {flag.status === 'pending' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flexShrink: 0 }}>
                    <button
                      onClick={() => takeDownListing(flag.listing_id, flag.id)}
                      style={{
                        padding: '0.75rem 1rem',
                        background: '#ef4444',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '0.9rem'
                      }}
                    >
                      <Trash2 size={16} style={{ display: 'inline-block', marginRight: '0.5rem' }} />
                      Take Down
                    </button>
                    <button
                      onClick={() => clearFlag(flag.id)}
                      style={{
                        padding: '0.75rem 1rem',
                        background: '#10b981',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '0.9rem'
                      }}
                    >
                      <Eye size={16} style={{ display: 'inline-block', marginRight: '0.5rem' }} />
                      Clear Flag
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
