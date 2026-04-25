import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { writeStoredSession, AUTH_SESSION_REFRESH_EVENT } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { AlertCircle } from 'lucide-react';
import AuthLoader from '../../components/AuthLoader';

// Parse hash fragment parameters (e.g., #access_token=xyz&refresh_token=abc)
function parseHashParams(hash: string): Record<string, string> {
  if (!hash || hash.length < 2) return {};
  const params: Record<string, string> = {};
  const pairs = hash.substring(1).split('&');
  for (const pair of pairs) {
    const [key, value] = pair.split('=');
    if (key && value) {
      params[decodeURIComponent(key)] = decodeURIComponent(value);
    }
  }
  return params;
}

export default function OAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { handleOAuthCallback } = useAuth();
  const [error, setError] = useState('');
  const processingRef = useRef(false);

  useEffect(() => {
    // Log OAuth callback details for debugging
    const code = searchParams.get('code');
    const hashParams = parseHashParams(window.location.hash);
    const accessToken = hashParams.access_token;
    const errorParam = searchParams.get('error');
    
    console.log('[OAuthCallback] Processing callback', {
      currentUrl: window.location.href,
      origin: window.location.origin,
      hasCode: !!code,
      hasAccessToken: !!accessToken,
      hasError: !!errorParam,
      errorDescription: searchParams.get('error_description'),
    });

    // Prevent double processing
    if (processingRef.current) return;
    
    // Check if we have anything to process
    if (!code && !accessToken) {
      // No auth data present yet, wait
      return;
    }
    
    processingRef.current = true;
    
    // Check for error in query params
    const errorDescription = searchParams.get('error_description');

    if (errorParam) {
      setError(errorDescription || 'Authentication failed');
      toast.error(errorDescription || 'Authentication failed');
      return;
    }

    // If we have a code, use PKCE flow
    if (code) {
      const processAuth = async () => {
        try {
          const { user, isNewUser } = await handleOAuthCallback(code);
          
          if (!user) {
            setError('Failed to authenticate');
            return;
          }

          // Redirect based on profile completion status
          if (isNewUser) {
            console.log('[OAuthCallback] New user, redirecting to complete-profile');
            navigate('/auth/complete-profile', { replace: true });
          } else {
            let dashboardPath = '/tenant/dashboard';
            if (user.role === 'admin') dashboardPath = '/admin';
            else if (user.role === 'landlord') dashboardPath = '/landlord/dashboard';
            else if (user.role === 'property_manager') dashboardPath = '/manager/dashboard';
            console.log('[OAuthCallback] Existing user, redirecting to dashboard', {
              userRole: user.role,
              dashboardPath,
              targetUrl: `${window.location.origin}${dashboardPath}`,
            });
            navigate(dashboardPath, { replace: true });
          }
        } catch (err) {
          console.error('OAuth callback error:', err);
          setError(err instanceof Error ? err.message : 'Authentication failed');
          toast.error('Failed to sign in. Please try again.');
        }
      };

      processAuth();
      return;
    }

    // If we have tokens in hash, Supabase is using implicit flow
    // Store the session and redirect
    if (accessToken) {
      try {
        // Build session object from hash params
        const session = {
          access_token: accessToken,
          refresh_token: hashParams.refresh_token || '',
          token_type: hashParams.token_type || 'bearer',
          expires_in: parseInt(hashParams.expires_in || '3600'),
          expires_at: Math.floor(Date.now() / 1000) + parseInt(hashParams.expires_in || '3600'),
          user: hashParams.user ? JSON.parse(hashParams.user) : {},
        };

        // Store session in localStorage (matching existing auth flow)
        writeStoredSession(session, true);
        
        // Check if new user - if profile is incomplete, redirect to complete-profile
        const userData = session.user || {};
        const userMetadata = userData.user_metadata || {};
        const hasPhone = userMetadata.phone || userData.phone;
        const isNewUser = !hasPhone;
        
        // Store redirect target for after AuthContext processes session
        const pendingRole = sessionStorage.getItem('oauth_signup_role');
        let roleForRedirect = pendingRole || userData.role || userMetadata.role || 'tenant';
        
        const redirectTarget = isNewUser 
          ? '/auth/complete-profile' 
<<<<<<< HEAD
          : (userData.role || userMetadata.role || 'tenant') === 'landlord' || (userData.role || userMetadata.role || 'tenant') === 'property_manager'
            ? '/landlord/dashboard'
            : '/tenant/dashboard';
        
        console.log('[OAuthCallback] Implicit flow processing', {
          isNewUser,
          userRole: userData.role || userMetadata.role,
          redirectTarget,
          targetUrl: `${window.location.origin}${redirectTarget}`,
        });
        
=======
          : roleForRedirect === 'landlord' || roleForRedirect === 'property_manager'
            ? '/landlord/dashboard'
            : '/tenant/dashboard';
>>>>>>> 4c78e6b35c8744ce24d3ed4a9f94d8c614f2c300
        sessionStorage.setItem('oauth_redirect_target', redirectTarget);
        
        // Trigger session refresh event so AuthContext picks up the new session
        window.dispatchEvent(new CustomEvent(AUTH_SESSION_REFRESH_EVENT, { 
          detail: { session, persistent: true } 
        }));
        
        // Wait a bit for AuthContext to process, then navigate
        setTimeout(() => {
          console.log('[OAuthCallback] Navigating to:', redirectTarget);
          navigate(redirectTarget, { replace: true });
        }, 300);
        return;
      } catch (err) {
        console.error('Failed to process implicit auth:', err);
        setError('Failed to process authentication');
        return;
      }
    }

    // No code or token found
    setError('No authorization code or token received');
  }, [searchParams, handleOAuthCallback, navigate]);

  if (error) {
    return (
      <div className="oauth-callback-page" style={styles.container}>
        <div style={styles.card}>
          <div style={styles.errorIcon}>
            <AlertCircle size={48} color="#ef4444" />
          </div>
          <h1 style={styles.title}>Authentication Failed</h1>
          <p style={styles.errorText}>{error}</p>
          <button 
            onClick={() => navigate('/auth/login')} 
            style={styles.button}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return <AuthLoader title="Completing Sign In..." subtitle="Please wait while we authenticate you" />;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--paper)',
    padding: '1rem',
  },
  card: {
    background: 'var(--surface)',
    borderRadius: '20px',
    padding: '3rem 2rem',
    textAlign: 'center',
    maxWidth: '400px',
    width: '100%',
    boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
    border: '1px solid var(--border)',
  },
  spinner: {
    animation: 'spin 1s linear infinite',
    color: 'var(--jade)',
    marginBottom: '1.5rem',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'var(--ink)',
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: '1rem',
    color: 'var(--mid)',
  },
  errorIcon: {
    marginBottom: '1.5rem',
  },
  errorText: {
    fontSize: '1rem',
    color: '#ef4444',
    marginBottom: '1.5rem',
  },
  button: {
    width: '100%',
    background: 'var(--jade, #16a34a)',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    padding: '0.95rem 1rem',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
};
