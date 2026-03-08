import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { confirmPasswordReset, requestPasswordReset } from '../lib/supabase';

type Phase = 'request' | 'sent' | 'reset' | 'success';

function extractTokenFromHash(): string | null {
    if (typeof window === 'undefined') return null;
    const hash = window.location.hash.slice(1); // strip leading #
    const params = new URLSearchParams(hash);
    return params.get('access_token') || null;
}

export default function ResetPasswordPage() {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const [phase, setPhase] = useState<Phase>('request');
    const [email, setEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [resetToken, setResetToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // If the user arrived via email link, pick up the access_token from the URL hash
    useEffect(() => {
        const token = extractTokenFromHash();
        if (token) {
            setResetToken(token);
            setPhase('reset');
            // Clean the token from the URL bar but keep the path
            window.history.replaceState(null, '', window.location.pathname);
        }
    }, []);

    const handleRequestReset = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');

        if (!email.trim()) {
            setError('Please enter your email address.');
            return;
        }

        setLoading(true);
        try {
            await requestPasswordReset(email.trim().toLowerCase());
            setPhase('sent');
        } catch (err: any) {
            // Supabase returns 200 even for unknown emails (security best practice),
            // so any real error here is a network / config issue.
            setError(err.message || 'Failed to send reset email. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSetNewPassword = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');

        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (!resetToken) {
            setError('Invalid or expired reset link. Please request a new one.');
            return;
        }

        setLoading(true);
        try {
            await confirmPasswordReset(resetToken, newPassword);
            setPhase('success');
        } catch (err: any) {
            setError(err.message || 'Failed to reset password. The link may have expired — request a new one.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container section auth-page">
            <section className="auth-shell">
                <aside className="auth-shell__intro">
                    <p className="auth-shell__eyebrow">Account Access</p>
                    <h1>
                        {phase === 'request' && 'Forgot your password?'}
                        {phase === 'sent' && 'Check your email'}
                        {phase === 'reset' && 'Set a new password'}
                        {phase === 'success' && 'Password updated!'}
                    </h1>
                    <p>
                        {phase === 'request' && "Enter your email and we'll send you a link to reset your password."}
                        {phase === 'sent' && 'A reset link has been sent. Click the link in the email to continue.'}
                        {phase === 'reset' && 'Choose a strong new password for your account.'}
                        {phase === 'success' && 'Your password has been changed. You can now log in.'}
                    </p>
                </aside>

                <article className="auth-shell__form card">
                    {error ? <p className="error-text" style={{ marginBottom: '1rem' }}>{error}</p> : null}

                    {/* ─── PHASE: request ─── */}
                    {phase === 'request' && (
                        <form onSubmit={handleRequestReset}>
                            <h2>Reset Password</h2>
                            <label>
                                {t('auth.email')}
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoComplete="email"
                                />
                            </label>

                            <button className="btn" type="submit" disabled={loading} style={{ marginTop: '1rem', width: '100%' }}>
                                {loading ? 'Sending…' : 'Send Reset Link'}
                            </button>

                            <div className="auth-links" style={{ marginTop: '1rem' }}>
                                <Link to="/login">{t('auth.login')}</Link>
                            </div>
                        </form>
                    )}

                    {/* ─── PHASE: sent ─── */}
                    {phase === 'sent' && (
                        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                            <p style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📧</p>
                            <p style={{ marginBottom: '1.5rem' }}>
                                We sent a link to <strong>{email}</strong>. It expires in 1 hour.
                            </p>
                            <button
                                className="btn btn--ghost"
                                type="button"
                                disabled={loading}
                                onClick={async () => {
                                    setLoading(true);
                                    setError('');
                                    try {
                                        await requestPasswordReset(email.trim().toLowerCase());
                                    } catch (err: any) {
                                        setError(err.message);
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                            >
                                {loading ? 'Resending…' : 'Resend email'}
                            </button>
                            <div className="auth-links" style={{ marginTop: '1rem' }}>
                                <Link to="/login">{t('auth.login')}</Link>
                            </div>
                        </div>
                    )}

                    {/* ─── PHASE: reset (user arrived with token) ─── */}
                    {phase === 'reset' && (
                        <form onSubmit={handleSetNewPassword}>
                            <h2>New Password</h2>
                            <label>
                                New password
                                <div className="password-field">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        minLength={8}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle"
                                        onClick={() => setShowPassword((prev) => !prev)}
                                    >
                                        {showPassword ? t('auth.hide') : t('auth.show')}
                                    </button>
                                </div>
                            </label>

                            <label style={{ marginTop: '0.75rem' }}>
                                Confirm password
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    minLength={8}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    autoComplete="new-password"
                                />
                            </label>

                            {newPassword.length > 0 && confirmPassword.length > 0 && (
                                <p
                                    className={newPassword === confirmPassword ? 'success-text' : 'error-text'}
                                    style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}
                                >
                                    {newPassword === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                                </p>
                            )}

                            <button className="btn" type="submit" disabled={loading} style={{ marginTop: '1.25rem', width: '100%' }}>
                                {loading ? 'Saving…' : 'Set New Password'}
                            </button>
                        </form>
                    )}

                    {/* ─── PHASE: success ─── */}
                    {phase === 'success' && (
                        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                            <p style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>✅</p>
                            <p style={{ marginBottom: '1.5rem' }}>Your password has been updated successfully.</p>
                            <button className="btn" type="button" onClick={() => navigate('/login')}>
                                Go to Login
                            </button>
                        </div>
                    )}
                </article>
            </section>
        </div>
    );
}
