import React from 'react';
import { LayoutDashboard, List, PlusCircle, Users, BarChart2, MessageSquare } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { InquiryCard } from '../../components/InquiryCard';
import { SkeletonCard } from '../../components/SkeletonCard';
import { useAuth } from '../../context/AuthContext';
import { useInquiries } from '../../hooks/useInquiries';
import toast from 'react-hot-toast';
import type { NavItem } from '../../types';

const NAV: NavItem[] = [
  { label: 'Dashboard',  href: '/landlord/dashboard',  icon: <LayoutDashboard size={16} /> },
  { label: 'Listings',   href: '/landlord/listings',   icon: <List size={16} /> },
  { label: 'Add Listing',href: '/landlord/listings/new',icon: <PlusCircle size={16} /> },
  { label: 'Inquiries',  href: '/landlord/inquiries',  icon: <MessageSquare size={16} /> },
  { label: 'Tenants',    href: '/landlord/tenants',    icon: <Users size={16} /> },
  { label: 'Analytics',  href: '/landlord/analytics',  icon: <BarChart2 size={16} /> },
];

export default function LandlordInquiries() {
  const { user, token } = useAuth();
  const { inquiries, loading, acceptInquiry, declineInquiry } = useInquiries('host', user?.userId ?? null, token);

  const pending  = inquiries.filter((i) => i.status === 'pending');
  const rest     = inquiries.filter((i) => i.status !== 'pending');

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
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: '1rem', marginBottom: '0.75rem' }}>
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
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: '1rem', marginBottom: '0.75rem' }}>
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
