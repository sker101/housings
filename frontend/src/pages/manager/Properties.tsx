import React from 'react';
import { Link } from 'react-router-dom';
import { Building } from 'lucide-react';
import { SkeletonCard } from '../../components/SkeletonCard';
import { StatusPill } from '../../components/StatusPill';
import { useAuth } from '../../context/AuthContext';
import { useListings } from '../../hooks/useListings';
import { TZSFormat } from '../../utils/format';
import type { ListingStatus } from '../../types';

const STATUS_ORDER: ListingStatus[] = ['approved', 'pending', 'rejected', 'flagged', 'suspended', 'draft'];

export default function DalaliProperties() {
  const { user, token } = useAuth();
  const { listings, loading } = useListings(token, { ownerId: user?.userId });

  // Group listings by status
  const grouped = STATUS_ORDER.reduce<Record<ListingStatus, typeof listings>>((acc, s) => {
    acc[s] = listings.filter((l) => l.status === s);
    return acc;
  }, { approved: [], pending: [], rejected: [], flagged: [], suspended: [], draft: [] });

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '1.3rem' }}>My Properties</h2>
          <p style={{ color: 'var(--mid)', fontSize: '0.86rem' }}>All listings you manage as a broker.</p>
        </div>
        <Link to="/manager/properties/new" className="btn btn--small">+ Add Property</Link>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gap: '0.7rem' }}><SkeletonCard variant="row" count={5} /></div>
      ) : listings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16 }}>
          <Building size={40} style={{ color: 'var(--mid)', marginBottom: '0.75rem' }} />
          <p style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: '0.35rem' }}>No properties yet</p>
          <p style={{ color: 'var(--mid)', fontSize: '0.86rem', marginBottom: '1rem' }}>Add your first property to start getting inquiries.</p>
          <Link to="/manager/properties/new" className="btn btn--small">Add Property</Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {STATUS_ORDER.filter((s) => grouped[s].length > 0).map((status) => (
            <section key={status}>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: '0.95rem', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <StatusPill variant={status} size="sm" />
                <span style={{ color: 'var(--mid)', fontWeight: 400 }}>({grouped[status].length})</span>
              </h3>
              <div style={{ display: 'grid', gap: '0.55rem' }}>
                {grouped[status].map((l) => (
                  <div key={l.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.title}</p>
                      <p style={{ fontSize: '0.79rem', color: 'var(--mid)', marginTop: '0.1rem' }}>{l.area ?? l.district} · {TZSFormat(l.price)}/mo · {l.views ?? 0} views</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      <Link to={`/listings/${l.id}`} className="btn btn--ghost btn--small">View</Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
