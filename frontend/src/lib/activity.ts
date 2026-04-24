import { insertRows } from './supabase';

/**
 * Log a user activity event.
 * @param userId - The ID of the user performing the action.
 * @param eventType - The category of event (e.g., 'auth', 'payment', 'booking').
 * @param description - A human-readable description of the action.
 * @param metadata - Optional JSON data.
 * @param accessToken - The user's access token.
 */
export async function logActivity(
  userId: string,
  eventType: string,
  description: string,
  metadata: Record<string, any> = {},
  accessToken: string
) {
  try {
    await insertRows('activity_log', {
      user_id: userId,
      event_type: eventType,
      description,
      metadata,
    }, { accessToken });
  } catch (err) {
    console.error('[ActivityLog] Failed to log event:', err);
  }
}

/**
 * Log a sign-in event only once per day per user.
 */
export async function logSignInOnce(userId: string, accessToken: string) {
  const today = new Date().toISOString().split('T')[0];
  const lastLogKey = `irent_last_signin_log_${userId}`;
  const lastLogDate = localStorage.getItem(lastLogKey);

  if (lastLogDate === today) return;

  await logActivity(userId, 'auth', 'Signed in to your account', {}, accessToken);
  localStorage.setItem(lastLogKey, today);
}
