import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageSquare, LayoutDashboard, ChevronRight, ArrowLeft } from 'lucide-react';
import { InquiryCard } from '../../components/InquiryCard';
import { SkeletonCard } from '../../components/SkeletonCard';
import { useAuth } from '../../context/AuthContext';
import { useInquiries } from '../../hooks/useInquiries';
import toast from 'react-hot-toast';

export default function LandlordInquiries() {
  const [isDashboardActive, setIsDashboardActive] = useState(false);
  const { user, token } = useAuth();
  const { inquiries, loading, acceptInquiry, declineInquiry } = useInquiries('host', user?.userId ?? null, token);
  const navigate = useNavigate();

  const pending  = inquiries.filter((i) => i.status === 'open');
  const rest     = inquiries.filter((i) => i.status !== 'open');

  const handleAccept = async (id: string) => {
    try { await acceptInquiry(id); toast.success('Inquiry accepted'); }
    catch { toast.error('Could not accept inquiry'); }
  };

  const handleDecline = async (id: string) => {
    try { await declineInquiry(id); toast.success('Inquiry declined'); }
    catch { toast.error('Could not decline inquiry'); }
  };
  return (
    <>
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
            e.currentTarget.style.borderColor = '#16a34a';
            e.currentTarget.style.color = '#16a34a';
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
            to="/landlord/dashboard" 
            className="topbar-action-btn"
            style={{display:'flex',alignItems:'center',gap:'0.35rem',color:'#64748b',textDecoration:'none',padding:'4px 8px',background:'transparent',border:'none',borderRadius:'8px'}}
          >
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </Link>
          <ChevronRight size={16} style={{color:'#cbd5e1'}} />
          <span style={{color:'#1e293b',fontWeight:600}}>Inquiries</span>
        </nav>
      </header>
      {loading ? (
        <div style={{ display: 'grid', gap: '0.7rem' }}><SkeletonCard variant="row" count={5} /></div>
      ) : inquiries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16 }}>
          <MessageSquare size={36} style={{ color: 'var(--mid)', marginBottom: '0.75rem' }} />
          <p style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: '0.3rem' }}>No inquiries yet</p>
          <p style={{ color: 'var(--mid)', fontSize: '0.86rem' }}>When students contact you about your listings, they'll appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1.25rem' }}>
          {pending.length > 0 && (
            <section>
              <h3 style={{ fontFamily: " sans-serif", fontSize: '1rem', marginBottom: '0.75rem' }}>
                Pending ({pending.length})
              </h3>
              <div style={{ display: 'grid', gap: '0.7rem' }}>
                {pending.map((i) => (
                  <InquiryCard key={i.id} inquiry={i} view="host" onAccept={handleAccept} onDecline={handleDecline} />
                ))}
              </div>
            </section>
          )}
          {rest.length > 0 && (
            <section>
              <h3 style={{ fontFamily: " sans-serif", fontSize: '1rem', marginBottom: '0.75rem' }}>
                History ({rest.length})
              </h3>
              <div style={{ display: 'grid', gap: '0.7rem' }}>
                {rest.map((i) => (
                  <InquiryCard key={i.id} inquiry={i} view="host" />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}
