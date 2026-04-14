import React from 'react';
import { MessageSquare } from 'lucide-react';
import { InquiryCard } from '../../components/InquiryCard';
import { SkeletonCard } from '../../components/SkeletonCard';
import { useAuth } from '../../context/AuthContext';
import { useInquiries } from '../../hooks/useInquiries';
import toast from 'react-hot-toast';
export default function DalaliInquiries() {
  const { user, token } = useAuth();
  const { inquiries, loading, acceptInquiry, declineInquiry } = useInquiries('host', user?.userId ?? null, token);

  const pending = inquiries.filter((i) => i.status === 'open');
  const rest    = inquiries.filter((i) => i.status !== 'open');

  const handleAccept  = async (id: string) => { try { await acceptInquiry(id);  toast.success('Inquiry accepted'); } catch { toast.error('Could not accept');  } };
  const handleDecline = async (id: string) => { try { await declineInquiry(id); toast.success('Inquiry declined'); } catch { toast.error('Could not decline'); } };

  return (
    <>
      {loading ? (
        <div style={{ display: 'grid', gap: '0.7rem' }}><SkeletonCard variant="row" count={5} /></div>
      ) : inquiries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16 }}>
          <MessageSquare size={36} style={{ color: 'var(--mid)', marginBottom: '0.75rem' }} />
          <p style={{ fontWeight: 600, color: 'var(--ink)' }}>No inquiries yet</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1.25rem' }}>
          {pending.length > 0 && (
            <section>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: '1rem', marginBottom: '0.75rem' }}>Pending ({pending.length})</h3>
              <div style={{ display: 'grid', gap: '0.7rem' }}>
                {pending.map((i) => <InquiryCard key={i.id} inquiry={i} view="host" onAccept={handleAccept} onDecline={handleDecline} />)}
              </div>
            </section>
          )}
          {rest.length > 0 && (
            <section>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: '1rem', marginBottom: '0.75rem' }}>History ({rest.length})</h3>
              <div style={{ display: 'grid', gap: '0.7rem' }}>
                {rest.map((i) => <InquiryCard key={i.id} inquiry={i} view="host" />)}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}
