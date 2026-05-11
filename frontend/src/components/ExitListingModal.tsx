/**
 * ExitListingModal.tsx — iRent
 * "Moving soon? List your room." flow — tenant move-out notice.
 *
 * FIXED: Fetches active lease using the correct tenant_leases table
 * and the tenant record (profiles.id → tenants.profile_id → tenant.id).
 *
 * IMPLEMENTS:
 *  - Loads active lease on open (30-day minimum)
 *  - Checks for existing pending/listing_created notice
 *  - Inserts move_out_notices row
 *  - Calls notify-landlord-move-out edge function
 *  - Success / already-submitted states
 */

import { useState, useEffect } from 'react';
import { Calendar, ArrowRight, Gift, X, CheckCircle2, Clock } from 'lucide-react';
import { selectRows, insertRows, invokeFunction } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const MIN_DAYS_AHEAD = 30;

function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function formatDateSw(iso: string): string {
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('sw-TZ', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch {
    return iso;
  }
}

interface ExitListingModalProps {
  onClose: () => void;
  onSuccess?: (newDate: string) => void;
}

type LeaseInfo = {
  leaseId: string;
  tenantProfileId: string;       // profiles.id (= auth.uid())
  landlordProfileId: string;     // landlord's profiles.id
  propertyId: string;
  roomId: string | null;
  propertyTitle: string;
  priceMonthly: number;
};

export default function ExitListingModal({ onClose, onSuccess }: ExitListingModalProps) {
  const { user, token } = useAuth();

  const [step, setStep]               = useState<'loading' | 'form' | 'already' | 'success' | 'error'>('loading');
  const [lease, setLease]             = useState<LeaseInfo | null>(null);
  const [existingNotice, setExistingNotice] = useState<{ created_at: string } | null>(null);
  const [moveOutDate, setMoveOutDate] = useState(addDays(new Date(), MIN_DAYS_AHEAD));
  const [notes, setNotes]             = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [errorMsg, setErrorMsg]       = useState('');
  // one of these is set depending on whether we have a lease or just a booking
  const [sourceLeaseId,   setSourceLeaseId]   = useState<string | null>(null);
  const [sourceBookingId, setSourceBookingId] = useState<string | null>(null);

  const minDate = addDays(new Date(), MIN_DAYS_AHEAD);

  // ── Load tenant's active lease on mount ─────────────────────────────────
  useEffect(() => {
    if (!user?.userId || !token) {
      setErrorMsg('Tafadhali ingia kwanza.');
      setStep('error');
      return;
    }
    loadLease();
  }, [user?.userId, token]);

  async function loadLease() {
    setStep('loading');
    setErrorMsg('');

    try {
      // 1. Get the tenant record (profile_id = auth.uid())
      const tenants = await selectRows('tenants', {
        select: 'id',
        filters: [{ column: 'profile_id', op: 'eq', value: user!.userId }],
        limit: 1,
        accessToken: token!,
      });

      if (!tenants.length) {
        setErrorMsg('Rekodi ya mpangaji haikupatikana.');
        setStep('error');
        return;
      }

      const tenantRow = tenants[0] as { id: string };

      // ── PATH A: active tenant_lease ─────────────────────────────────────
      const leases = await selectRows('tenant_leases', {
        select: 'id, room_id, landlord_id, status',
        filters: [
          { column: 'tenant_id', op: 'eq', value: tenantRow.id },
          { column: 'status',    op: 'eq', value: 'active' },
        ],
        order: 'created_at.desc',
        limit: 1,
        accessToken: token!,
      });

      if (leases.length) {
        const leasRow = leases[0] as {
          id: string; room_id: string | null; landlord_id: string; status: string;
        };
        setSourceLeaseId(leasRow.id);
        setSourceBookingId(null);

        const landlordRecs = await selectRows('landlords', {
          select: 'id, profile_id',
          filters: [{ column: 'id', op: 'eq', value: leasRow.landlord_id }],
          limit: 1,
          accessToken: token!,
        });
        const landlordProfileId: string = landlordRecs[0]?.profile_id ?? leasRow.landlord_id;

        // fetch room + property
        let propertyId = '';
        let propertyTitle = 'Chumba Chako';
        let priceMonthly = 0;
        if (leasRow.room_id) {
          const roomRecs = await selectRows('rooms', {
            select: 'id, property_id, price_tzs',
            filters: [{ column: 'id', op: 'eq', value: leasRow.room_id }],
            limit: 1, accessToken: token!,
          });
          if (roomRecs.length) {
            const room = roomRecs[0] as { id: string; property_id: string; price_tzs: number };
            propertyId = room.property_id;
            priceMonthly = room.price_tzs;
            const propRecs = await selectRows('properties', {
              select: 'id, title',
              filters: [{ column: 'id', op: 'eq', value: room.property_id }],
              limit: 1, accessToken: token!,
            });
            if (propRecs.length) propertyTitle = (propRecs[0] as any).title ?? 'Chumba Chako';
          }
        }

        setLease({ leaseId: leasRow.id, tenantProfileId: user!.userId, landlordProfileId, propertyId, roomId: leasRow.room_id, propertyTitle, priceMonthly });

        // check existing notice
        const existing = await selectRows('move_out_notices', {
          select: 'id, created_at, status',
          filters: [
            { column: 'lease_id',  op: 'eq', value: leasRow.id },
            { column: 'tenant_id', op: 'eq', value: user!.userId },
            { column: 'status',    op: 'in', value: '(pending,listing_created)' },
          ],
          limit: 1, accessToken: token!,
        });
        if (existing.length) { setExistingNotice(existing[0] as { created_at: string }); setStep('already'); }
        else setStep('form');

      } else {
        // ── PATH B: fallback to approved/confirmed bookings ──────────────
        // Dashboard does the same. Tenants like George have a booking but
        // no tenant_lease row because the landlord hasn't created one yet.
        const bookings = await selectRows('bookings', {
          select: 'id, room_id, property_id, landlord_id, move_in_date, status',
          filters: [
            { column: 'tenant_id', op: 'eq', value: tenantRow.id },
            { column: 'status',    op: 'in', value: '(paid,confirmed,approved)' },
          ],
          order: 'created_at.desc',
          limit: 1, accessToken: token!,
        });

        if (!bookings.length) {
          setErrorMsg('Hukupata lisi wala booking iliyoidhinishwa. Wasiliana na msaada wa iRent.');
          setStep('error');
          return;
        }

        const bk = bookings[0] as {
          id: string; room_id: string | null; property_id: string; landlord_id: string;
        };
        setSourceBookingId(bk.id);
        setSourceLeaseId(null);

        const landlordRecs = await selectRows('landlords', {
          select: 'id, profile_id',
          filters: [{ column: 'id', op: 'eq', value: bk.landlord_id }],
          limit: 1, accessToken: token!,
        });
        // IMPORTANT: landlord_id on bookings is landlords.id, but move_out_notices.landlord_id
        // references profiles.id. Only use profile_id; if not found, set null (not landlords.id).
        const landlordProfileId: string | null = landlordRecs[0]?.profile_id ?? null;

        let propertyId = bk.property_id ?? '';
        let propertyTitle = 'Chumba Chako';
        let priceMonthly = 0;
        if (bk.room_id) {
          const roomRecs = await selectRows('rooms', {
            select: 'id, property_id, price_tzs',
            filters: [{ column: 'id', op: 'eq', value: bk.room_id }],
            limit: 1, accessToken: token!,
          });
          if (roomRecs.length) {
            const room = roomRecs[0] as { property_id: string; price_tzs: number };
            propertyId = room.property_id || propertyId;
            priceMonthly = room.price_tzs;
          }
        }
        if (propertyId) {
          const propRecs = await selectRows('properties', {
            select: 'id, title',
            filters: [{ column: 'id', op: 'eq', value: propertyId }],
            limit: 1, accessToken: token!,
          });
          if (propRecs.length) propertyTitle = (propRecs[0] as any).title ?? 'Chumba Chako';
        }

        setLease({ leaseId: bk.id, tenantProfileId: user!.userId, landlordProfileId, propertyId, roomId: bk.room_id, propertyTitle, priceMonthly });

        // check existing notice via booking_id
        const existing = await selectRows('move_out_notices', {
          select: 'id, created_at, status',
          filters: [
            { column: 'booking_id', op: 'eq', value: bk.id },
            { column: 'tenant_id',  op: 'eq', value: user!.userId },
            { column: 'status',     op: 'in', value: '(pending,listing_created)' },
          ],
          limit: 1, accessToken: token!,
        });
        if (existing.length) { setExistingNotice(existing[0] as { created_at: string }); setStep('already'); }
        else setStep('form');
      }
    } catch (err: any) {
      console.error('[ExitListingModal] loadLease error:', err);
      setErrorMsg(err?.message ?? 'Imeshindwa kupakia taarifa za lisi. Jaribu tena.');
      setStep('error');
    }
  }

  // ── Submit ───────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!lease) return;
    setErrorMsg('');

    if (!moveOutDate || moveOutDate < minDate) {
      setErrorMsg(`Tarehe ya kuondoka lazima iwe angalau siku ${MIN_DAYS_AHEAD} kutoka leo.`);
      return;
    }

    setSubmitting(true);
    try {
      // Build notice payload — sanitize every UUID field: empty string → null
      // (prevents "invalid input syntax for type uuid" when property_id or room_id is unresolved)
      const uuid = (v: unknown) => (v && String(v).trim() ? v : null);

      const noticePayload: Record<string, unknown> = {
        tenant_id:              uuid(lease.tenantProfileId),
        landlord_id:            uuid(lease.landlordProfileId),
        property_id:            uuid(lease.propertyId),
        room_id:                uuid(lease.roomId),
        intended_move_out_date: moveOutDate,
        handover_notes:         notes.trim() || null,
        status:                 'pending',
      };
      if (sourceLeaseId)   noticePayload.lease_id   = sourceLeaseId;
      if (sourceBookingId) noticePayload.booking_id  = sourceBookingId;

      const inserted = await insertRows('move_out_notices', noticePayload, { accessToken: token! });
      const noticeId = (inserted as any)?.[0]?.id;

      // Call edge function (fire and forget — don't block on SMS failure)
      if (noticeId) {
        invokeFunction('notify-landlord-move-out', { move_out_notice_id: noticeId }, token!).catch(
          (e) => console.warn('[ExitListingModal] notify edge function error (non-fatal):', e)
        );
      }

      setStep('success');
      onSuccess?.(moveOutDate);
    } catch (err: any) {
      console.error('[ExitListingModal] submit error:', err);
      const msg: string = err?.message ?? '';

      // Check for duplicate (unique constraint or existing record)
      if (msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('already')) {
        setErrorMsg('Umeshatuma notisi. Subiri mwenye nyumba akubali.');
      } else {
        setErrorMsg(msg || 'Imeshindwa kutuma. Jaribu tena.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  // ── Overlay ──────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{
        background: 'var(--cream, white)', borderRadius: '20px',
        width: '100%', maxWidth: '460px',
        padding: '2rem', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        position: 'relative', maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Close */}
        <button onClick={onClose} aria-label="Funga" style={{
          position: 'absolute', top: '1rem', right: '1rem',
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'var(--mid, #64748b)', padding: '4px',
        }}>
          <X size={20} />
        </button>

        {/* ── LOADING ────────────────────────────────────────────────────── */}
        {step === 'loading' && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              border: '4px solid var(--border, #e2e8f0)',
              borderTop: '4px solid var(--jade, #22c55e)',
              margin: '0 auto 1rem',
              animation: 'spin 1s linear infinite',
            }} />
            <p style={{ color: 'var(--mid, #64748b)', fontSize: '0.9rem' }}>
              Inapakia taarifa…
            </p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* ── ERROR ──────────────────────────────────────────────────────── */}
        {step === 'error' && (
          <>
            <Header />
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: '10px', padding: '1rem',
              color: '#dc2626', fontSize: '0.88rem',
              marginBottom: '1.25rem',
            }}>
              {errorMsg || 'Hitilafu isiyojulikana. Jaribu tena.'}
            </div>
            <button onClick={onClose} style={cancelBtnStyle}>Funga</button>
          </>
        )}

        {/* ── ALREADY SUBMITTED ──────────────────────────────────────────── */}
        {step === 'already' && existingNotice && (
          <>
            <Header subtitle={lease?.propertyTitle} />
            <div style={{
              background: '#fffbeb', border: '1px solid #fde68a',
              borderRadius: '12px', padding: '1rem 1.25rem',
              display: 'flex', gap: '0.75rem', marginBottom: '1.25rem',
            }}>
              <Clock size={20} color="#d97706" style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: '#92400e' }}>
                  Notisi yako imetumwa
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#b45309' }}>
                  tarehe {formatDateSw(existingNotice.created_at.split('T')[0])}. Inasubiri idhini ya mwenye nyumba.
                </p>
              </div>
            </div>
            <button onClick={onClose} style={cancelBtnStyle}>Sawa</button>
          </>
        )}

        {/* ── FORM ───────────────────────────────────────────────────────── */}
        {step === 'form' && (
          <>
            <Header subtitle={lease?.propertyTitle ?? 'Chumba Chako'} />

            {/* Referral Incentive Banner */}
            <div style={{
              background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)',
              border: '1px solid #bbf7d0',
              borderRadius: '12px', padding: '1rem 1.25rem',
              display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
              marginBottom: '1.5rem',
            }}>
              <Gift size={20} color="#16a34a" style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: '#15803d' }}>
                  Pata zawadi ya TZS {new Intl.NumberFormat('sw-TZ').format(20000)}!
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#166534' }}>
                  Mpangaji mpya akipanga chumba chako, tutaingiza TZS 20,000 kwenye mkoba wako wa iRent — bila kutarajiwa.
                </p>
              </div>
            </div>

            {/* Date picker */}
            <label style={{ display: 'block', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--mid, #475569)', display: 'block', marginBottom: 6 }}>
                Chagua tarehe ya kuondoka
              </span>
              <input
                type="date"
                id="move-out-date"
                value={moveOutDate}
                min={minDate}
                onChange={(e) => setMoveOutDate(e.target.value)}
                style={{
                  width: '100%', padding: '0.75rem 1rem',
                  border: '1.5px solid var(--border, #e2e8f0)', borderRadius: '10px',
                  fontSize: '1rem', color: 'var(--ink, #1e293b)',
                  outline: 'none', boxSizing: 'border-box',
                  fontFamily: "'Inter', sans-serif",
                }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--mid, #94a3b8)', marginTop: 4, display: 'block' }}>
                Kiwango cha chini: siku {MIN_DAYS_AHEAD} kutoka leo
              </span>
            </label>

            {/* Handover notes */}
            <label style={{ display: 'block', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--mid, #475569)', display: 'block', marginBottom: 6 }}>
                Maelezo ya Chumba <span style={{ fontWeight: 400, opacity: 0.7 }}>(hiari)</span>
              </span>
              <textarea
                id="handover-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, 500))}
                placeholder="Hali ya chumba, samani zilizopo, nk."
                rows={3}
                style={{
                  width: '100%', padding: '0.75rem 1rem',
                  border: '1.5px solid var(--border, #e2e8f0)', borderRadius: '10px',
                  fontSize: '0.9rem', color: 'var(--ink, #1e293b)',
                  outline: 'none', boxSizing: 'border-box', resize: 'vertical',
                  fontFamily: "'Inter', sans-serif",
                }}
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--mid, #94a3b8)', display: 'block', textAlign: 'right' }}>
                {notes.length}/500
              </span>
            </label>

            {/* What happens next */}
            <div style={{
              background: 'var(--cream, #f8fafc)', borderRadius: '10px',
              padding: '1rem', marginBottom: '1.5rem',
            }}>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--mid, #475569)' }}>
                Kinachofuata:
              </p>
              {[
                'Chumba chako kitaonekana kwenye utafutaji na beji ya "Coming Soon"',
                'Wapangaji wanaovutiwa wanaweza kupanga chumba mapema',
                'Kama mtu akilipa, utapata TZS 20,000',
                'Mwisho wa lisi yako utasasishwa kulingana na tarehe uliochagua',
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: 4 }}>
                  <span style={{ color: 'var(--jade, #22c55e)', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>
                    {i + 1}.
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--mid, #64748b)' }}>{step}</span>
                </div>
              ))}
            </div>

            {/* Error */}
            {errorMsg && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: '8px', padding: '0.75rem 1rem',
                color: '#dc2626', fontSize: '0.85rem',
                marginBottom: '1rem',
              }}>
                {errorMsg}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={onClose} style={cancelBtnStyle}>Ghairi</button>
              <button
                id="exit-modal-submit"
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  flex: 2, padding: '0.85rem',
                  borderRadius: '10px', border: 'none',
                  background: submitting
                    ? 'var(--mid, #94a3b8)'
                    : 'linear-gradient(135deg, var(--jade, #22c55e), #16a34a)',
                  color: 'white',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem', fontWeight: 600,
                  fontFamily: "'Inter', sans-serif",
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: '0.5rem',
                  transition: 'all 0.2s ease',
                }}
              >
                {submitting ? 'Inatuma…' : (
                  <>Orodhesha chumba <ArrowRight size={16} /></>
                )}
              </button>
            </div>
          </>
        )}

        {/* ── SUCCESS ────────────────────────────────────────────────────── */}
        {step === 'success' && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{
              width: 64, height: 64,
              background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.25rem',
            }}>
              <CheckCircle2 size={34} color="#16a34a" />
            </div>
            <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.25rem', fontWeight: 800, color: 'var(--ink, #1e293b)' }}>
              Notisi Imetumwa!
            </h2>
            <p style={{ margin: '0 0 1.5rem', fontSize: '0.9rem', color: 'var(--mid, #64748b)', lineHeight: 1.6 }}>
              Mwenye nyumba wako ataarifiwa na SMS. Ukikubali, chumba chako kitaonekana kama{' '}
              <strong style={{ color: '#16a34a' }}>Coming Soon</strong> kwenye iRent.
            </p>
            <button onClick={onClose} style={{
              background: 'linear-gradient(135deg, var(--jade, #22c55e), #16a34a)',
              color: 'white', border: 'none',
              borderRadius: '10px', padding: '0.85rem 2rem',
              fontSize: '0.9rem', fontWeight: 700,
              cursor: 'pointer', width: '100%',
            }}>
              Funga
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Header({ subtitle }: { subtitle?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
      <div style={{
        width: 44, height: 44, borderRadius: '12px',
        background: 'linear-gradient(135deg, var(--jade, #22c55e), #16a34a)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Calendar size={22} color="white" />
      </div>
      <div>
        <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--ink, #1e293b)' }}>
          Unaondoka hivi karibuni?
        </h2>
        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--mid, #64748b)' }}>
          {subtitle ?? 'Chumba Chako cha Sasa'}
        </p>
      </div>
    </div>
  );
}

const cancelBtnStyle: React.CSSProperties = {
  flex: 1, padding: '0.85rem',
  border: '1.5px solid var(--border, #e2e8f0)',
  borderRadius: '10px', background: 'transparent',
  cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600,
  color: 'var(--mid, #64748b)',
  fontFamily: "'Inter', sans-serif",
};
