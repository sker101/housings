import { corsHeaders, json, withCors } from '../_shared/cors.ts';
import { createRequestClient, createServiceClient } from '../_shared/supabase.ts';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CheckResult {
    check_type: string;
    result: 'pass' | 'warn' | 'block';
    severity: 'critical' | 'high' | 'medium' | 'low';
    detail: string;
    metadata?: Record<string, unknown>;
}

interface ScreeningPayload {
    listingId: string;
    listing: {
        title?: string;
        description?: string;
        price_monthly: number;
        region?: string;
        district?: string;
        ward?: string;
        street?: string;
        lat?: number;
        lng?: number;
        room_type?: string;
    };
    photos?: Array<{
        public_url: string;
        angle?: string;
        ai_verified?: boolean;
        ai_confidence?: number;
    }>;
    listerId: string;
}

// ─── Individual Checks ───────────────────────────────────────────────────────

async function checkVerificationGate(
    supabase: ReturnType<typeof createServiceClient>,
    listerId: string
): Promise<CheckResult> {
    const { data: profile } = await supabase
        .from('profiles')
        .select('verification_status, phone_verified')
        .eq('id', listerId)
        .single();

    if (!profile) {
        return {
            check_type: 'verification_gate',
            result: 'block',
            severity: 'critical',
            detail: 'Your profile could not be found. Please contact support.',
        };
    }

    const verified = profile.verification_status === 'verified' && profile.phone_verified;

    if (!verified) {
        return {
            check_type: 'verification_gate',
            result: 'block',
            severity: 'critical',
            detail:
                'Your account is not yet fully verified. Please complete phone verification and ensure your ID has been reviewed before submitting listings.',
        };
    }

    return { check_type: 'verification_gate', result: 'pass', severity: 'low', detail: 'Landlord is verified.' };
}

async function checkPriceAnomaly(
    supabase: ReturnType<typeof createServiceClient>,
    listing: ScreeningPayload['listing']
): Promise<CheckResult> {
    if (!listing.price_monthly || listing.price_monthly <= 0) {
        return {
            check_type: 'price_anomaly',
            result: 'block',
            severity: 'critical',
            detail: 'A valid monthly price is required.',
        };
    }

    // Try to find median price at ward level, fall back to district, then region
    for (const [col, val] of [
        ['ward', listing.ward],
        ['district', listing.district],
        ['region', listing.region],
    ]) {
        if (!val) continue;

        const { data: rows } = await supabase
            .from('listings')
            .select('price_monthly')
            .eq(col, val)
            .eq('room_type', listing.room_type ?? 'single')
            .eq('status', 'approved')
            .limit(50);

        if (rows && rows.length >= 5) {
            const prices = rows.map((r) => r.price_monthly).sort((a, b) => a - b);
            const median = prices[Math.floor(prices.length / 2)];
            const deviation = (median - listing.price_monthly) / median;

            let meta = { median, submitted: listing.price_monthly, deviation: Math.round(deviation * 100), level: col };

            if (deviation > 0.6) {
                return {
                    check_type: 'price_anomaly',
                    result: 'block',
                    severity: 'high',
                    detail: `Your listed price of TZS ${listing.price_monthly.toLocaleString()}/mo is over 60% below the local area median of TZS ${median.toLocaleString()}/mo. Please confirm this price is correct, or update it.`,
                    metadata: meta,
                };
            }
            if (deviation > 0.3) {
                return {
                    check_type: 'price_anomaly',
                    result: 'warn',
                    severity: 'medium',
                    detail: `Your price of TZS ${listing.price_monthly.toLocaleString()}/mo is notably below the area median of TZS ${median.toLocaleString()}/mo. The listing will be flagged for admin review.`,
                    metadata: meta,
                };
            }

            return { check_type: 'price_anomaly', result: 'pass', severity: 'low', detail: 'Price is within normal range.', metadata: meta };
        }
    }

    // Insufficient data to compare — pass
    return { check_type: 'price_anomaly', result: 'pass', severity: 'low', detail: 'Insufficient local data for price comparison. Passed by default.' };
}

function checkTextPatterns(listing: ScreeningPayload['listing']): CheckResult {
    const SCAM_PHRASES = [
        /currently abroad/i,
        /pay deposit to confirm/i,
        /send money first/i,
        /western union/i,
        /moneygram/i,
        /wire transfer/i,
        /god fearing/i,
        /honest landlord/i,
    ];
    const CONTACT_PATTERN = /(\+?\d[\d\s\-]{8,}|\b0[67]\d{8}\b|wa\.me\/|whatsapp|@\w+\.[a-z]{2,}|\b[\w.+-]+@[\w-]+\.\w{2,}\b)/i;

    const fullText = `${listing.title ?? ''} ${listing.description ?? ''}`;

    if (CONTACT_PATTERN.test(fullText)) {
        return {
            check_type: 'text_pattern',
            result: 'block',
            severity: 'critical',
            detail:
                'Your listing contains contact details (phone number, email, or WhatsApp link) in the title or description. Please remove these and let tenants contact you through the platform messaging system.',
        };
    }

    for (const phrase of SCAM_PHRASES) {
        if (phrase.test(fullText)) {
            return {
                check_type: 'text_pattern',
                result: 'block',
                severity: 'critical',
                detail: `Your listing contains a phrase commonly associated with scam listings ("${phrase.source}"). Please rewrite the listing in your own words and remove this phrase.`,
            };
        }
    }

    if ((listing.description ?? '').trim().length < 40) {
        return {
            check_type: 'text_pattern',
            result: 'warn',
            severity: 'medium',
            detail: 'Your listing description is very short. Adding more detail helps tenants make informed decisions and improves your visibility.',
        };
    }

    return { check_type: 'text_pattern', result: 'pass', severity: 'low', detail: 'No suspicious text patterns found.' };
}

async function checkAddressDuplicate(
    supabase: ReturnType<typeof createServiceClient>,
    listing: ScreeningPayload['listing'],
    listerId: string,
    listingId: string
): Promise<CheckResult> {
    if (!listing.lat || !listing.lng) {
        return { check_type: 'address_duplicate', result: 'pass', severity: 'low', detail: 'No coordinates to check.' };
    }

    // Check for a different landlord's approved listing at close proximity
    const { data: nearby } = await supabase
        .from('listings')
        .select('id, lister_id, title')
        .eq('status', 'approved')
        .neq('id', listingId)
        .neq('lister_id', listerId)
        // rough bounding box — ±0.0002 degree ≈ 22m
        .gte('lat', listing.lat - 0.0002)
        .lte('lat', listing.lat + 0.0002)
        .gte('lng', listing.lng - 0.0002)
        .lte('lng', listing.lng + 0.0002)
        .limit(5);

    if (nearby && nearby.length > 0) {
        return {
            check_type: 'address_duplicate',
            result: 'warn',
            severity: 'high',
            detail: `There is already a listing from a different landlord at or very close to this location. If this is a shared building, please ensure your listing is for a distinct unit. Admin will review this.`,
            metadata: { nearby_ids: nearby.map((r) => r.id) },
        };
    }

    return { check_type: 'address_duplicate', result: 'pass', severity: 'low', detail: 'No nearby duplicate listings found.' };
}

function checkPhotos(photos: ScreeningPayload['photos']): CheckResult {
    if (!photos || photos.length === 0) {
        return {
            check_type: 'duplicate_photo',
            result: 'warn',
            severity: 'medium',
            detail: 'No photos were submitted. Listings with photos get significantly more inquiries.',
        };
    }

    // Check for AI-verified mismatches (score from inspect-photo function)
    const mismatched = photos.filter(
        (p) => p.ai_verified === false && (p.ai_confidence ?? 0) > 0.85
    );

    if (mismatched.length > 0) {
        return {
            check_type: 'duplicate_photo',
            result: 'block',
            severity: 'critical',
            detail: `${mismatched.length} of your photos appear to not match the declared angle or property type. Please upload original photos of your actual property.`,
            metadata: { mismatched_count: mismatched.length },
        };
    }

    return { check_type: 'duplicate_photo', result: 'pass', severity: 'low', detail: 'Photos passed initial checks.' };
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return withCors('ok', 200, corsHeaders);
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    const payload: ScreeningPayload = await req.json().catch(() => null);
    if (!payload?.listingId || !payload?.listerId) {
        return json({ error: 'listingId and listerId are required' }, 400);
    }

    try {
        const supabase = createServiceClient();
        const userClient = createRequestClient(req);

        // Verify the calling user owns this listing
        const { data: listingRow } = await userClient
            .from('listings')
            .select('id, lister_id')
            .eq('id', payload.listingId)
            .single();

        if (!listingRow || listingRow.lister_id !== payload.listerId) {
            return json({ error: 'Unauthorized' }, 403);
        }

        // Run all checks in parallel
        const [verificationResult, priceResult, addressResult] = await Promise.all([
            checkVerificationGate(supabase, payload.listerId),
            checkPriceAnomaly(supabase, payload.listing),
            checkAddressDuplicate(supabase, payload.listing, payload.listerId, payload.listingId),
        ]);

        const textResult = checkTextPatterns(payload.listing);
        const photoResult = checkPhotos(payload.photos);

        const checks: CheckResult[] = [verificationResult, priceResult, addressResult, textResult, photoResult];

        // Determine overall result
        const hasBlock = checks.some((c) => c.result === 'block');
        const hasWarn = checks.some((c) => c.result === 'warn');
        const overall = hasBlock ? 'block' : hasWarn ? 'warn' : 'pass';

        // Persist check results
        const checkRows = checks.map((c) => ({
            listing_id: payload.listingId,
            check_type: c.check_type,
            result: c.result,
            severity: c.severity,
            detail: c.detail,
            metadata: c.metadata ?? {},
        }));

        await supabase.from('listing_checks').insert(checkRows);

        // Auto-publish or block the listing
        const newStatus = overall === 'block' ? 'pending' : 'approved';
        const updateData: Record<string, unknown> = {
            status: newStatus,
            screening_passed: !hasBlock,
        };
        if (!hasBlock) {
            updateData.auto_published_at = new Date().toISOString();
        }
        await supabase.from('listings').update(updateData).eq('id', payload.listingId);

        return json({
            overall,
            checks,
            published: !hasBlock,
            blockedChecks: checks.filter((c) => c.result === 'block').map((c) => c.detail),
        });
    } catch (err) {
        return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500);
    }
});
