import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { selectRows, updateRows, insertRows } from '../lib/supabase';
import { X, AlertCircle, Loader, Phone, Mail, Check, ShieldX } from 'lucide-react';
import toast from 'react-hot-toast';

interface Profile {
  id: string;
  full_name: string;
  email?: string;
  phone: string;
  role: 'tenant' | 'landlord' | 'property_manager' | 'admin';
  university?: string;
  status?: 'active' | 'suspended' | 'pending';
  verification_status?: string;
  created_at: string;
  avatar_url?: string;
}

interface Listing {
  id: string;
  title: string;
  status: 'draft' | 'published' | 'archived' | 'taken_down';
  created_at: string;
}

export default function AdminAccessPage() {
  const { user: currentUser, token } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Profile | null>(null);
  const [, setIsViewMode] = useState(true);
  const [accountListings, setAccountListings] = useState<Listing[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: string; message: string } | null>(null);

  const searchAccounts = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await selectRows('profiles', {
        select: 'id,full_name,phone,role,verification_status,created_at',
        or: `full_name.ilike.%${query}%,phone.ilike.%${query}%`,
        accessToken: token,
      });
      // Map verification_status to a status field for display
      setSearchResults(results.map((p: any) => ({ ...p, status: p.verification_status === 'suspended' ? 'suspended' : 'active' })));
    } catch (err) {
      toast.error('Failed to search accounts');
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const loadAccountDetails = async (profile: Profile) => {
    setSelectedAccount(profile);
    setIsViewMode(true);

    if (profile.role === 'lister') {
      setIsLoadingListings(true);
      try {
        const listings = await selectRows('listings', {
          select: 'id,title,status,created_at',
          filters: [{ column: 'lister_id', op: 'eq', value: profile.id }],
          accessToken: token,
        });
        setAccountListings(listings);
      } catch (_err) {
        toast.error('Failed to load listings');
      } finally {
        setIsLoadingListings(false);
      }
    }
  };

  const logAdminAction = async (action: string, targetType: string, targetId: string, metadata?: any) => {
    try {
      await insertRows('admin_audit_log', {
        admin_id: currentUser?.userId,
        action,
        target_type: targetType,
        target_id: targetId,
        metadata: metadata || {},
        created_at: new Date().toISOString()
      });
    } catch (err) {
      console.error('Failed to log action:', err);
    }
  };

  const suspendAccount = async () => {
    if (!selectedAccount || !token) return;

    try {
      await updateRows('profiles', { verification_status: 'suspended' }, {
        filters: [{ column: 'id', op: 'eq', value: selectedAccount.id }],
        accessToken: token,
      });

      await logAdminAction('suspend_account', 'profile', selectedAccount.id, {
        previous_status: selectedAccount.status
      });

      toast.success('Account suspended');
      setSelectedAccount({ ...selectedAccount, status: 'suspended' });
      setConfirmAction(null);
    } catch (_err) {
      toast.error('Failed to suspend account');
    }
  };

  const unsuspendAccount = async () => {
    if (!selectedAccount || !token) return;

    try {
      await updateRows('profiles', { verification_status: 'unverified' }, {
        filters: [{ column: 'id', op: 'eq', value: selectedAccount.id }],
        accessToken: token,
      });

      await logAdminAction('unsuspend_account', 'profile', selectedAccount.id, {
        previous_status: selectedAccount.status
      });

      toast.success('Account unsuspended');
      setSelectedAccount({ ...selectedAccount, status: 'active' });
      setConfirmAction(null);
    } catch (_err) {
      toast.error('Failed to unsuspend account');
    }
  };

  const banPhoneNumber = async (reason: string) => {
    if (!selectedAccount?.phone || !token) return;

    try {
      await insertRows('banned_phones', {
        phone: selectedAccount.phone,
        banned_by: currentUser?.userId,
        reason,
        banned_at: new Date().toISOString()
      }, { accessToken: token });

      await logAdminAction('ban_phone', 'phone', selectedAccount.id, {
        phone: selectedAccount.phone,
        reason
      });

      toast.success('Phone number banned');
      setConfirmAction(null);
    } catch (_err) {
      toast.error('Failed to ban phone number');
    }
  };

  const roleColors: Record<string, string> = {
    tenant: '#3b82f6',
    property_manager: '#7c3aed',
    landlord: '#ec4899',
    admin: '#ef4444'
  };

  const statusColors: Record<string, string> = {
    active: '#10b981',
    suspended: '#ef4444',
    pending: '#f59e0b'
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header with Warning */}
      <div style={{
        background: '#fef3c7',
        border: '1px solid #f59e0b',
        borderRadius: '8px',
        padding: '1rem',
        marginBottom: '2rem',
        display: 'flex',
        gap: '1rem',
        alignItems: 'flex-start'
      }}>
        <AlertCircle size={20} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <p style={{ fontWeight: '700', color: '#92400e', marginBottom: '0.25rem' }}>
            High Privilege Zone
          </p>
          <p style={{ fontSize: '0.9rem', color: '#b45309' }}>
            All actions on user accounts are logged and audited. Proceed with caution.
          </p>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                searchAccounts(e.target.value);
              }}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '0.95rem',
                fontFamily: 'inherit'
              }}
            />
            {isSearching && (
              <Loader size={18} style={{ position: 'absolute', right: '1rem', top: '0.75rem', animation: 'spin 1s linear infinite' }} />
            )}
          </div>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
            {searchResults.map((profile) => (
              <div
                key={profile.id}
                style={{
                  padding: '1rem',
                  borderBottom: '1px solid #f3f4f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  background: '#fff'
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = '#f9fafb')}
                onMouseOut={(e) => (e.currentTarget.style.background = '#fff')}
              >
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{profile.full_name}</p>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem', color: '#6b7280' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Mail size={14} /> {profile.email}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Phone size={14} /> {profile.phone}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <span style={{
                      background: roleColors[profile.role],
                      color: '#fff',
                      fontSize: '0.75rem',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontWeight: '600'
                    }}>
                      {profile.role.toUpperCase()}
                    </span>
                    <span style={{
                      background: statusColors[profile.status],
                      color: '#fff',
                      fontSize: '0.75rem',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontWeight: '600'
                    }}>
                      {profile.status.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => { setIsViewMode(true); loadAccountDetails(profile); }}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#f3f4f6',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      color: '#1f2937'
                    }}
                  >
                    View
                  </button>
                  <button
                    onClick={() => { setIsViewMode(false); loadAccountDetails(profile); }}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#1f2937',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: '600'
                    }}
                  >
                    Admin Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Account Detail Modal/Drawer */}
      {selectedAccount && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'flex-end',
          zIndex: 50
        }}>
          <div style={{
            background: '#fff',
            width: '100%',
            maxWidth: '500px',
            height: '100%',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header */}
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Account Details</h2>
              <button
                onClick={() => setSelectedAccount(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  color: '#6b7280'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Profile Info */}
              <div>
                <h3 style={{ fontSize: '0.9rem', fontWeight: '700', textTransform: 'uppercase', color: '#6b7280', marginBottom: '1rem' }}>
                  Profile Information
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: '600' }}>Full Name</label>
                    <p style={{ fontSize: '1rem', fontWeight: '500' }}>{selectedAccount.full_name}</p>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: '600' }}>Email</label>
                    <p style={{ fontSize: '1rem', fontWeight: '500' }}>{selectedAccount.email}</p>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: '600' }}>Phone</label>
                    <p style={{ fontSize: '1rem', fontWeight: '500' }}>{selectedAccount.phone}</p>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: '600' }}>Role</label>
                    <span style={{
                      display: 'inline-block',
                      background: roleColors[selectedAccount.role],
                      color: '#fff',
                      fontSize: '0.85rem',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '4px',
                      fontWeight: '600',
                      marginTop: '0.25rem'
                    }}>
                      {selectedAccount.role.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: '600' }}>Status</label>
                    <span style={{
                      display: 'inline-block',
                      background: statusColors[selectedAccount.status],
                      color: '#fff',
                      fontSize: '0.85rem',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '4px',
                      fontWeight: '600',
                      marginTop: '0.25rem'
                    }}>
                      {selectedAccount.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Listings (Dalalis/Landlords) */}
              {selectedAccount.role === 'lister' && (
                <div>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: '700', textTransform: 'uppercase', color: '#6b7280', marginBottom: '1rem' }}>
                    Listings ({accountListings.length})
                  </h3>
                  {isLoadingListings ? (
                    <p style={{ color: '#6b7280' }}>Loading listings...</p>
                  ) : accountListings.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {accountListings.map((listing) => (
                        <div key={listing.id} style={{
                          padding: '0.75rem',
                          background: '#f9fafb',
                          borderRadius: '6px',
                          fontSize: '0.9rem'
                        }}>
                          <p style={{ fontWeight: '500' }}>{listing.title}</p>
                          <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>{listing.status}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: '#6b7280' }}>No listings</p>
                  )}
                </div>
              )}

              {/* Enforcement Actions */}
              <div>
                <h3 style={{ fontSize: '0.9rem', fontWeight: '700', textTransform: 'uppercase', color: '#6b7280', marginBottom: '1rem' }}>
                  Enforcement Actions
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {selectedAccount.status === 'active' ? (
                    <button
                      onClick={() => setConfirmAction({
                        type: 'suspend',
                        message: `Are you sure you want to suspend ${selectedAccount.full_name}'s account? They will not be able to log in.`
                      })}
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
                      <ShieldX size={16} style={{ display: 'inline-block', marginRight: '0.5rem' }} />
                      Suspend Account
                    </button>
                  ) : (
                    <button
                      onClick={() => setConfirmAction({
                        type: 'unsuspend',
                        message: `Re-activate ${selectedAccount.full_name}'s account?`
                      })}
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
                      <Check size={16} style={{ display: 'inline-block', marginRight: '0.5rem' }} />
                      Unsuspend Account
                    </button>
                  )}
                  <button
                    onClick={() => setConfirmAction({
                      type: 'ban_phone',
                      message: `Ban phone number ${selectedAccount.phone}? This user's phone will be blocked from registering new accounts.`
                    })}
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
                    <Phone size={16} style={{ display: 'inline-block', marginRight: '0.5rem' }} />
                    Ban Phone Number
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmAction && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 51
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '8px',
            padding: '2rem',
            maxWidth: '400px',
            textAlign: 'center'
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem' }}>Confirm Action</h3>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem', lineHeight: '1.5' }}>{confirmAction.message}</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmAction(null)}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmAction.type === 'suspend') suspendAccount();
                  else if (confirmAction.type === 'unsuspend') unsuspendAccount();
                  else if (confirmAction.type === 'ban_phone') banPhoneNumber('Admin action');
                }}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
