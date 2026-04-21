import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Eye, Users, Lock, Building, Gavel, DollarSign, AlertTriangle,
  BarChart3, Settings, BookOpen, LogOut, X, Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const TEAL = '#0d7a6e';
const BORDER = '#e5e7eb';
const WHITE = '#ffffff';
const MUTED = '#6b7280';
const FONT = "'Nunito', 'Poppins', system-ui, sans-serif";

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
}

interface NavCategory {
  name: string;
  items: NavItem[];
}

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const { logout } = useAuth();

  const categories: NavCategory[] = [
    {
      name: 'Overview',
      items: [
        { label: 'Dashboard', icon: <LayoutDashboard size={16} />, path: '/admin' },
        { label: 'Live Activity', icon: <Eye size={16} />, path: '/admin?tab=overview' }
      ]
    },
    {
      name: 'Users',
      items: [
        { label: 'All Users', icon: <Users size={16} />, path: '/admin/users' },
        { label: 'Access Accounts', icon: <Lock size={16} />, path: '/admin/access' },
        { label: 'Hosts & PMs', icon: <Building size={16} />, path: '/admin/landlords' },
        { label: 'Tenants', icon: <Users size={16} />, path: '/admin/students' }
      ]
    },
    {
      name: 'Operations',
      items: [
        { label: 'Listings', icon: <Building size={16} />, path: '/admin/listings' },
        { label: 'Disputes', icon: <Gavel size={16} />, path: '/admin/disputes' },
        { label: 'Payments', icon: <DollarSign size={16} />, path: '/admin/payments' },
        { label: 'Flagged Content', icon: <AlertTriangle size={16} />, path: '/admin/flags' }
      ]
    },
    {
      name: 'Platform',
      items: [
        { label: 'Analytics', icon: <BarChart3 size={16} />, path: '/admin/analytics' },
        { label: 'System Config', icon: <Settings size={16} />, path: '/admin/config' },
        { label: 'Audit Log', icon: <BookOpen size={16} />, path: '/admin/audit' }
      ]
    }
  ];

  const handleLogout = () => {
    onClose();
    logout();
  };

  return (
    <>

      {/* Drawer Modal */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 999,
          display: 'flex',
          background: 'transparent'
        }}>
          {/* Backdrop - clickable to close */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.4)',
              zIndex: 998
            }}
            onClick={onClose}
          />

          {/* Sidebar Panel - higher z-index */}
          <div style={{
            position: 'fixed',
            left: 0,
            top: 0,
            height: '100%',
            width: '280px',
            background: WHITE,
            display: 'flex',
            flexDirection: 'column',
            fontFamily: FONT,
            boxShadow: '2px 0 20px rgba(0, 0, 0, 0.15)',
            zIndex: 999,
            animation: 'slideIn 0.25s ease'
          }}>
            {/* Header */}
            <div style={{
              padding: '1.5rem',
              borderBottom: `1px solid ${BORDER}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ fontWeight: '700', fontSize: '1rem', margin: 0 }}>iRent Admin</h2>
              <button
                onClick={onClose}
                type="button"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  color: MUTED,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.2s'
                }}
                onMouseOver={(e) => (e.currentTarget.style.color = TEAL)}
                onMouseOut={(e) => (e.currentTarget.style.color = MUTED)}
              >
                <X size={24} />
              </button>
            </div>

            {/* Navigation */}
            <nav style={{ flex: 1, padding: '1rem 0', overflowY: 'auto' }}>
              {categories.map((category) => (
                <div key={category.name} style={{ marginBottom: '1.5rem' }}>
                  <p style={{
                    fontSize: '0.7rem',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: MUTED,
                    padding: '0.5rem 1.5rem 0.75rem',
                    margin: 0
                  }}>
                    {category.name}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {category.items.map((item) => (
                      <NavLink
                        key={item.label}
                        to={item.path}
                        onClick={onClose}
                        style={({ isActive: active }) => ({
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.65rem 1.5rem',
                          color: active ? TEAL : '#525252',
                          background: active ? '#f0fffe' : 'transparent',
                          borderLeft: active ? `4px solid ${TEAL}` : '4px solid transparent',
                          paddingLeft: active ? '1.25rem' : '1.5rem',
                          textDecoration: 'none',
                          fontWeight: active ? '600' : '500',
                          fontSize: '0.88rem',
                          transition: 'all 0.15s'
                        })}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', width: '18px' }}>
                          {item.icon}
                        </span>
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                </div>
              ))}
            </nav>

            {/* Footer */}
            <div style={{
              padding: '1.5rem',
              borderTop: `1px solid ${BORDER}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              {/* Super Admin Badge */}
              <div style={{
                background: '#fef3c7',
                border: `1px solid #fcd34d`,
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <Shield size={18} style={{ color: '#d97706', flexShrink: 0 }} />
                <div>
                  <p style={{ fontWeight: '700', margin: 0, fontSize: '0.85rem', color: '#92400e' }}>
                    Super Admin
                  </p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#b45309' }}>Full access</p>
                </div>
              </div>
              {/* Sign Out Button */}
              <button
                onClick={handleLogout}
                type="button"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  background: '#fff1ec',
                  color: '#e8550a',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  fontFamily: FONT,
                  transition: 'all 0.15s'
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = '#ffe5d5')}
                onMouseOut={(e) => (e.currentTarget.style.background = '#fff1ec')}
              >
                <LogOut size={18} />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
