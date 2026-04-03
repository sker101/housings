import React, { useState, useEffect } from 'react';
import { selectRows, updateRows, insertRows, countRows } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Gavel, AlertCircle, Eye, MessageSquare, DollarSign, Trash2, X, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

interface Dispute {
  id: string;
  type: string;
  title: string;
  description: string;
  status: 'open' | 'under_review' | 'resolved';
  priority: 'low' | 'medium' | 'urgent';
  reporter_id: string;
  respondent_id: string;
  amount_disputed: number;
  created_at: string;
  resolution?: string;
}

export default function AdminDisputesPage() {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [activeTab, setActiveTab] = useState('open');
  const [isLoading, setIsLoading] = useState(true);
  const [counts, setCounts] = useState({ open: 0, under_review: 0, resolved: 0 });

  useEffect(() => {
    loadDisputes();
    loadCounts();
  }, [activeTab]);

  const loadCounts = async () => {
    try {
      const counts = await Promise.all([
        countRows('disputes', { filters: ['status.eq.open'] }),
        countRows('disputes', { filters: ['status.eq.under_review'] }),
        countRows('disputes', { filters: ['status.eq.resolved'] })
      ]);
      setCounts({
        open: counts[0],
        under_review: counts[1],
        resolved: counts[2]
      });
    } catch (error) {
      console.error('Failed to load counts:', error);
    }
  };

  const loadDisputes = async () => {
    setIsLoading(true);
    try {
      const data = await selectRows('disputes', {
        filters: [`status.eq.${activeTab}`],
        order: 'created_at.desc'
      });
      setDisputes(data);
    } catch (error) {
      toast.error('Failed to load disputes');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const resolveDispute = async (disputeId: string, resolution: 'reporter_wins' | 'respondent_wins') => {
    try {
      await updateRows('disputes', {
        status: 'resolved',
        resolution,
        resolved_by: user?.id
      }, {
        filters: [`id.eq.${disputeId}`]
      });

      await insertRows('admin_audit_log', {
        admin_id: user?.id,
        action: 'resolve_dispute',
        target_type: 'dispute',
        target_id: disputeId,
        metadata: { resolution }
      });

      toast.success('Dispute resolved');
      loadDisputes();
      loadCounts();
    } catch (error) {
      toast.error('Failed to resolve dispute');
    }
  };

  const priorityColors: Record<string, string> = {
    low: '#3b82f6',
    medium: '#f59e0b',
    urgent: '#ef4444'
  };

  const priorityBgColors: Record<string, string> = {
    low: '#eff6ff',
    medium: '#fffbeb',
    urgent: '#fef2f2'
  };

  const tabs = [
    { id: 'open', label: 'Open', count: counts.open },
    { id: 'under_review', label: 'Under Review', count: counts.under_review },
    { id: 'resolved', label: 'Resolved', count: counts.resolved }
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.5rem' }}>Dispute Resolution</h1>
        <p style={{ color: '#6b7280' }}>Review and resolve user disputes and conflicts</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #e5e7eb', marginBottom: '2rem' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '1rem 1.5rem',
              background: activeTab === tab.id ? '#fff' : 'transparent',
              borderBottom: activeTab === tab.id ? '2px solid #0d7a6e' : 'none',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: activeTab === tab.id ? '600' : '500',
              color: activeTab === tab.id ? '#0d7a6e' : '#6b7280',
              border: 'none'
            }}
          >
            {tab.label} <span style={{ marginLeft: '0.5rem', color: '#9ca3af' }}>({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          <Loader size={32} style={{ margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }} />
          Loading disputes...
        </div>
      )}

      {/* Disputes List */}
      {!isLoading && disputes.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          background: '#f9fafb',
          borderRadius: '8px',
          color: '#6b7280'
        }}>
          <AlertCircle size={32} style={{ margin: '0 auto 1rem', opacity: '0.5' }} />
          No disputes found in this category
        </div>
      )}

      {/* Disputes Grid */}
      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {disputes.map((dispute) => (
          <div
            key={dispute.id}
            style={{
              background: '#fff',
              border: `3px solid ${priorityColors[dispute.priority]}`,
              borderRadius: '8px',
              padding: '1.5rem',
              display: 'flex',
              gap: '1.5rem'
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <span style={{
                  background: priorityBgColors[dispute.priority],
                  color: priorityColors[dispute.priority],
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '4px',
                  textTransform: 'uppercase'
                }}>
                  {dispute.priority}
                </span>
                <span style={{
                  fontSize: '0.85rem',
                  color: '#6b7280'
                }}>
                  {new Date(dispute.created_at).toLocaleDateString()}
                </span>
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem' }}>{dispute.title}</h3>
              <p style={{ color: '#6b7280', marginBottom: '1rem', lineHeight: '1.5' }}>{dispute.description}</p>
              {dispute.amount_disputed && (
                <p style={{
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  color: '#1f2937'
                }}>
                  <DollarSign size={16} style={{ display: 'inline-block', marginRight: '0.5rem' }} />
                  Amount Disputed: {new Intl.NumberFormat('sw-TZ', { style: 'currency', currency: 'TZS' }).format(dispute.amount_disputed)}
                </p>
              )}
            </div>

            {/* Actions */}
            {dispute.status === 'open' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flexShrink: 0 }}>
                <button
                  onClick={() => resolveDispute(dispute.id, 'reporter_wins')}
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
                  Rule Reporter
                </button>
                <button
                  onClick={() => resolveDispute(dispute.id, 'respondent_wins')}
                  style={{
                    padding: '0.75rem 1rem',
                    background: '#f59e0b',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '0.9rem'
                  }}
                >
                  Rule Respondent
                </button>
                <button
                  style={{
                    padding: '0.75rem 1rem',
                    background: '#3b82f6',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '0.9rem'
                  }}
                >
                  <Eye size={16} style={{ display: 'inline-block', marginRight: '0.5rem' }} />
                  Evidence
                </button>
                <button
                  style={{
                    padding: '0.75rem 1rem',
                    background: '#8b5cf6',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '0.9rem'
                  }}
                >
                  <MessageSquare size={16} style={{ display: 'inline-block', marginRight: '0.5rem' }} />
                  Message
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
