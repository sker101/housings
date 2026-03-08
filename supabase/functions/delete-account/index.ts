import { corsHeaders, json, withCors } from '../_shared/cors.ts';
import { createRequestClient, createServiceClient } from '../_shared/supabase.ts';

/**
 * DELETE-ACCOUNT edge function
 *
 * Authenticates the caller using their Bearer token, then uses the
 * service-role client to permanently delete the auth.users record.
 * All user data cascades automatically per the FK constraints.
 *
 * Required headers:
 *   Authorization: Bearer <user-access-token>
 *
 * Returns:
 *   200 { ok: true }
 *   401 when no valid token supplied
 *   500 on unexpected errors
 */
Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return withCors('ok', 200, corsHeaders);
    }

    if (req.method !== 'POST') {
        return json({ error: 'Method not allowed' }, 405);
    }

    try {
        // 1. Verify the caller is a valid authenticated user
        const requestClient = createRequestClient(req);
        const { data: { user }, error: authError } = await requestClient.auth.getUser();

        if (authError || !user) {
            return json({ error: 'Unauthorized. Please log in and try again.' }, 401);
        }

        const userId = user.id;

        // 2. Use service-role client to perform the privileged deletion
        const serviceClient = createServiceClient();
        const { error: deleteError } = await serviceClient.auth.admin.deleteUser(userId);

        if (deleteError) {
            console.error(`[delete-account] Failed to delete user ${userId}:`, deleteError.message);
            return json({ error: deleteError.message }, 500);
        }

        console.log(`[delete-account] Successfully deleted user ${userId}`);
        return json({ ok: true });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unexpected error';
        console.error('[delete-account] Unexpected error:', message);
        return json({ error: message }, 500);
    }
});
