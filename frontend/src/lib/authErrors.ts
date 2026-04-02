export function normalizeAuthError(error: unknown, mode: 'login' | 'register' = 'login') {
  const rawMessage = String((error as { message?: string } | null)?.message || '').trim();
  const message = rawMessage.toLowerCase();

  if (!message) {
    return mode === 'register'
      ? 'Unable to create your account right now. Please try again.'
      : 'Unable to sign in right now. Please try again.';
  }

  if (message.includes('user already registered') || message.includes('user_already_exists')) {
    return 'An account with this email already exists. Sign in instead, or use a different email address.';
  }

  if (message.includes('invalid login credentials')) {
    return 'Incorrect email or password.';
  }

  if (message.includes('email not confirmed')) {
    return 'Your email address has not been verified yet.';
  }

  if (message.includes('profiles_phone_unique') || (message.includes('duplicate key value') && message.includes('phone'))) {
    return 'This phone number is already linked to another account.';
  }

  if (message.includes('password should be at least') || message.includes('password must be at least')) {
    return 'Password must be at least 8 characters.';
  }

  if (message.includes('email address') && message.includes('invalid')) {
    return 'Enter a valid email address.';
  }

  if (message.includes('rate limit') || message.includes('security purposes')) {
    return 'Too many attempts were made. Please wait a moment and try again.';
  }

  return rawMessage;
}
