import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { selectRows } from '../lib/supabase';
import { fetchListingBookingsForUser, upsertListingReview } from '../lib/listings';
import { APP_ROLE } from '../lib/roles';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LayoutDashboard, ChevronRight, ArrowLeft } from 'lucide-react';
export default function ReviewsPage() {
  const { user, token } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const listingQuery = searchParams.get('listing');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviews, setReviews] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [listings, setListings] = useState<Record<string, any>>({});

  const [canReview, setCanReview] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      if (!user?.userId || !token) return;
      try {
        setLoading(true);

        let reviewRows: any[] = [];

        if (listingQuery) {
          reviewRows = await selectRows('reviews', {
            select: 'id,tenant_id,listing_id,rating,comment,created_at',
            filters: [{ column: 'listing_id', op: 'eq', value: listingQuery }],
            order: 'created_at.desc',
            limit: 100,
            accessToken: token
          });

          if (user.role === APP_ROLE.TENANT) {
            try {
              const bookings = await fetchListingBookingsForUser({
                listingId: listingQuery,
                userId: user.userId,
                accessToken: token
              });
              if (bookings.some((b) => b.status === 'approved')) {
                setCanReview(true);
              }
            } catch {
              // Can't review
            }
          }
        } else if (user.role === APP_ROLE.LANDLORD) {
          const myListingRows = await selectRows('listings', {
            select: 'id,title',
            filters: [{ column: 'lister_id', op: 'eq', value: user.userId }],
            limit: 500,
            accessToken: token
          });
          const ids = myListingRows.map((r: any) => r.id);
          const listingMap: Record<string, any> = {};
          myListingRows.forEach((r: any) => (listingMap[r.id] = r));
          setListings(listingMap);

          if (ids.length > 0) {
            reviewRows = await selectRows('reviews', {
              select: 'id,tenant_id,listing_id,rating,comment,created_at',
              filters: [{ column: 'listing_id', op: 'in', value: `(${ids.join(',')})` }],
              order: 'created_at.desc',
              limit: 100,
              accessToken: token
            });
          }
        } else {
          reviewRows = await selectRows('reviews', {
            select: 'id,tenant_id,listing_id,rating,comment,created_at',
            filters: [{ column: 'tenant_id', op: 'eq', value: user.userId }],
            order: 'created_at.desc',
            limit: 50,
            accessToken: token
          });
        }

        if (!mounted) return;

        if (reviewRows.length > 0 && user.role === APP_ROLE.LANDLORD) {
          const uIds = Array.from(new Set(reviewRows.map((r) => r.tenant_id)));
          const userRows = await selectRows('profiles', {
            select: 'id,full_name',
            filters: [{ column: 'id', op: 'in', value: `(${uIds.join(',')})` }],
            limit: 200,
            accessToken: token
          });
          const cmap: Record<string, any> = {};
          userRows.forEach((u: any) => (cmap[u.id] = u));
          setProfiles(cmap);
        }

        if (reviewRows.length > 0) {
          const listIds = Array.from(new Set(reviewRows.map((r) => r.listing_id)));
          const rListings = await selectRows('listings', {
            select: 'id,title',
            filters: [{ column: 'id', op: 'in', value: `(${listIds.join(',')})` }],
            limit: 100,
            accessToken: token
          });
          const lmap: Record<string, any> = {};
          rListings.forEach((l: any) => (lmap[l.id] = l));
          setListings((prev) => ({ ...prev, ...lmap }));
        }

        setReviews(reviewRows);
      } catch (err: any) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, [user?.userId, token, user?.role, listingQuery]);

  const handleSubmitReview = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!listingQuery || !user?.userId || !token) return;

    if (myRating < 1 || myRating > 5) {
      setError('Please select a rating between 1 and 5 stars.');
      return;
    }

    setSubmittingReview(true);
    setError('');

    try {
      await upsertListingReview({
        listingId: listingQuery,
        tenantId: user.userId,
        rating: myRating,
        comment: myComment,
        accessToken: token
      });

      const newReviewRows = await selectRows('reviews', {
        select: 'id,tenant_id,listing_id,rating,comment,created_at',
        filters: [{ column: 'listing_id', op: 'eq', value: listingQuery }],
        order: 'created_at.desc',
        limit: 100,
        accessToken: token
      });
      setReviews(newReviewRows);

      setMyRating(0);
      setMyComment('');
      setNotice('Review submitted successfully.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0 ? (reviews.reduce((acc, r) => acc + Number(r.rating), 0) / totalReviews).toFixed(1) : 0;

  const renderStars = (count: number) =>
    [1, 2, 3, 4, 5].map((s) => (
      <span key={s} className={`star ${s <= count ? 'on' : 'off'}`}>★</span>
    ));

  return (
    <>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}} .rv-page{padding:2rem} .rv-summary{display:flex;gap:12px;margin-bottom:1.5rem;flex-wrap:wrap} .sum-card{background:var(--cream,#f8faf9);border-radius:12px;padding:14px 20px;display:flex;align-items:center;gap:14px} .sum-val{font-size:28px;font-weight:700;line-height:1;color:var(--ink)} .sum-lbl{font-size:11px;color:var(--mid);text-transform:uppercase;letter-spacing:.04em;margin-bottom:2px} .rv-stars{display:flex;gap:2px} .star{font-size:14px} .star.on{color:#EF9F27} .star.off{color:var(--border)} .rv-list{display:flex;flex-direction:column;gap:10px} .rv-card{background:#ffffff;border:0.5px solid var(--border);border-radius:14px;padding:15px 16px} .rv-card-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px} .rv-name{font-size:13px;font-weight:600;color:var(--ink)} .rv-listing{font-size:11px;color:var(--mid);margin-top:2px} .rv-date{font-size:11px;color:var(--mid);margin-top:4px} .rv-comment{font-size:12px;color:var(--ink);line-height:1.6;margin-top:10px;padding:10px 12px;background:var(--cream);border-radius:8px;font-style:italic} .rv-no-comment{font-size:11px;color:var(--mid);font-style:italic;margin-top:8px} .form-card{background:#ffffff;border:0.5px solid var(--border);border-radius:14px;padding:16px;margin-bottom:1.5rem} .form-card h3{font-size:13px;font-weight:600;margin-bottom:12px;color:var(--ink)} .star-btn{font-size:24px;background:none;border:none;cursor:pointer;padding:0 2px;color:var(--border);transition:color 0.1s} .star-btn.on{color:#EF9F27} .rv-textarea{width:100%;padding:9px 12px;border-radius:9px;border:0.5px solid var(--border);font-size:12px;resize:vertical;outline:none;margin-top:10px;font-family:inherit;line-height:1.5;min-height:80px} .rv-submit{padding:8px 18px;border-radius:9px;border:none;background:var(--jade);color:#fff;font-size:12px;font-weight:600;cursor:pointer;margin-top:10px} .rv-submit:disabled{opacity:0.5;cursor:default} .rv-empty{padding:3rem 2rem;text-align:center;color:var(--mid);font-size:13px;background:#ffffff;border:0.5px solid var(--border);border-radius:14px} @media(max-width:768px){.rv-page{padding:1rem}}`}</style>
      {/* Breadcrumb Header */}
      <header style={{background:'white',borderRadius:'12px',padding:'1rem 1.25rem',margin:'1rem 1rem 0',boxShadow:'0 1px 3px rgba(0,0,0,0.06)',display:'flex',alignItems:'center'}}>
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: '1px solid #e2e8f0',
            background: 'white',
            cursor: 'pointer',
            color: '#64748b',
            marginRight: '0.75rem',
            transition: 'all 0.2s',
            padding: 0
          }}
          title="Go Back"
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--jade, #22c55e)';
            e.currentTarget.style.color = 'var(--jade, #22c55e)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.color = '#64748b';
          }}
        >
          <ArrowLeft size={16} />
        </button>
        <nav style={{display:'flex',alignItems:'center',gap:'0.5rem',fontSize:'0.9rem'}}>
          <Link 
            to={user?.role === APP_ROLE.LANDLORD ? "/landlord/dashboard" : "/tenant/dashboard"} 
            className="topbar-action-btn"
            style={{display:'flex',alignItems:'center',gap:'0.35rem',color:'#64748b',textDecoration:'none',padding:'4px 8px',background:'transparent',border:'none',borderRadius:'8px'}}
          >
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </Link>
          <ChevronRight size={16} style={{color:'#cbd5e1'}} />
          <span style={{color:'#1e293b',fontWeight:600}}>{t('reviews.title', 'Reviews')}</span>
        </nav>
      </header>

      <div className="rv-page" style={{paddingTop:0}}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '1.5rem'
          }}
        >
          <div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>
              {listingQuery
                ? 'Listing reviews'
                : user?.role === APP_ROLE.LANDLORD
                  ? t('reviews.tenantReviews')
                  : t('reviews.myReviews')}
            </h1>
            <p style={{ fontSize: 12, color: 'var(--mid)', marginTop: 4 }}>
              {listingQuery
                ? t('reviews.publicSubtitle', 'See what others have said about this property.')
                : user?.role === APP_ROLE.LANDLORD
                  ? t('reviews.landlordSubtitle')
                  : t('reviews.studentSubtitle')}
            </p>
          </div>
        </div>

        {notice ? (
          <p
            style={{
              fontSize: 13,
              color: '#27500A',
              background: '#EAF3DE',
              padding: '10px 14px',
              borderRadius: 9,
              marginBottom: '1rem'
            }}
          >
            {notice}
          </p>
        ) : null}

        {error ? (
          <p
            style={{
              fontSize: 13,
              color: '#791F1F',
              background: '#FCEBEB',
              padding: '10px 14px',
              borderRadius: 9,
              marginBottom: '1rem'
            }}
          >
            {error}
          </p>
        ) : null}

        {canReview && listingQuery ? (
          <div className="form-card">
            <h3>{t('roomDetails.writeReview')}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="rv-stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={`star-btn${star <= (hoverRating || myRating) ? ' on' : ''}`}
                    onClick={() => setMyRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <span style={{ fontSize: 12, color: 'var(--mid)' }}>
                {myRating > 0 ? `${myRating}/5` : 'Select rating'}
              </span>
            </div>
            <textarea
              className="rv-textarea"
              value={myComment}
              onChange={(event) => setMyComment(event.target.value)}
              placeholder="Share your experience..."
              maxLength={500}
            />
            <button
              type="button"
              className="rv-submit"
              disabled={submittingReview || myRating === 0}
              onClick={handleSubmitReview}
            >
              {submittingReview ? t('roomDetails.submitting') : t('roomDetails.submitReview')}
            </button>
          </div>
        ) : null}

        {user?.role === APP_ROLE.LANDLORD && totalReviews > 0 ? (
          <div className="rv-summary">
            <div className="sum-card">
              <div>
                <p className="sum-lbl">Avg. rating</p>
                <p className="sum-val" style={{ margin: 0 }}>{avgRating}</p>
              </div>
              <div className="rv-stars">{renderStars(Math.round(Number(avgRating)))}</div>
            </div>
            <div className="sum-card">
              <div>
                <p className="sum-lbl">Total reviews</p>
                <p className="sum-val" style={{ margin: 0 }}>{totalReviews}</p>
                <div style={{ fontSize: 11, color: 'var(--mid)', marginTop: 4 }}>Across all properties</div>
              </div>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="rv-list">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={`rv-skel-${i}`}
                style={{
                  height: 100,
                  borderRadius: 14,
                  background: 'var(--cream)',
                  animation: 'pulse 1.5s ease-in-out infinite'
                }}
              />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="rv-empty">{t('reviews.noReviews')}</div>
        ) : (
          <div className="rv-list">
            {reviews.map((r) => (
              <div key={r.id} className="rv-card">
                <div className="rv-card-top">
                  <div>
                    <p className="rv-name" style={{ margin: 0 }}>
                      {user?.role === APP_ROLE.LANDLORD
                        ? profiles[r.tenant_id]?.full_name || t('reviews.anonymousTenant')
                        : `${t('reviews.reviewFor')}: ${listings[r.listing_id]?.title || ''}`}
                    </p>
                    {user?.role === APP_ROLE.LANDLORD ? (
                      <p className="rv-listing" style={{ margin: 0 }}>
                        {listings[r.listing_id]?.title || ''}
                      </p>
                    ) : null}
                    <p className="rv-date" style={{ margin: 0 }}>
                      {new Date(r.created_at).toLocaleDateString('en-TZ', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="rv-stars">{renderStars(r.rating)}</div>
                  </div>
                </div>
                {r.comment ? (
                  <div className="rv-comment">“{r.comment}”</div>
                ) : (
                  <p className="rv-no-comment">{t('reviews.ratingOnly')}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {listingQuery && user && user.role === APP_ROLE.TENANT && !canReview ? (
          <p style={{ fontSize: 12, color: 'var(--mid)', marginTop: '1.5rem' }}>
            You can only review this listing if you have an approved booking.
          </p>
        ) : null}
      </div>
    </>
  );
}
