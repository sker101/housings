import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { invokeFunction, selectRows } from '../lib/supabase';
import ModerationModal from '../components/ModerationModal';

const REASON_TEMPLATES = {
  reject: [
    'ID document is unclear or does not match profile details',
    'Selfie verification did not match ID document',
    'Insufficient profile information for trust verification'
  ],
  suspend: [
    'Repeated policy violations after warning',
    'Fraudulent or misleading account activity',
    'Abusive behavior reported by multiple users'
  ]
};

function normalizeStatus(value) {
  return String(value || '').toLowerCase();
}

export default function AdminLandlordsPage() {
  const { token } = useAuth();
  const [landlords, setLandlords] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalState, setModalState] = useState({
    isOpen: false,
    action: '',
    targetId: null,
    isBulk: false
  });

  const loadLandlords = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const rows = await selectRows('profiles', {
        select:
          'id,full_name,phone,verification_status,lister_type,profile_photo_url,id_doc_url,selfie_url,updated_at',
        filters: [{ column: 'role', op: 'eq', value: 'lister' }],
        order: 'updated_at.desc',
        accessToken: token
      });

      setLandlords(rows);
      setSelectedIds((prev) => {
        const next = new Set();
        rows.forEach((row) => {
          if (prev.has(row.id)) {
            next.add(row.id);
          }
        });
        return next;
      });
    } catch (err) {
      setError(err.message);
      setLandlords([]);
      setSelectedIds(new Set());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLandlords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const openModal = (action, targetId = null, isBulk = false) => {
    if (action === 'approve') {
      if (isBulk) {
        processBulkAction('approve', null);
      } else {
        processAction(targetId, 'approve', null);
      }
      return;
    }

    setModalState({
      isOpen: true,
      action,
      targetId,
      isBulk
    });
  };

  const handleModalClose = () => {
    setModalState({ isOpen: false, action: '', targetId: null, isBulk: false });
  };

  const handleModalSubmit = async (reason) => {
    const { action, targetId, isBulk } = modalState;
    handleModalClose();

    if (isBulk) {
      await processBulkAction(action, reason);
    } else {
      await processAction(targetId, action, reason);
    }
  };

  const processAction = async (targetId, action, reason = null) => {
    if (!token || !targetId) return;

    try {
      await invokeFunction(
        'admin-action',
        {
          action: action === 'approve'
            ? 'approve_landlord'
            : action === 'reject'
              ? 'reject_landlord'
              : 'suspend',
          targetType: 'landlord',
          targetId: targetId,
          reason: reason || null
        },
        token
      );
      await loadLandlords();
    } catch (err) {
      setError(err.message);
    }
  };

  const processBulkAction = async (action, reason = null) => {
    if (selectedIds.size === 0) return;

    for (const landlordId of selectedIds) {

      try {
        await invokeFunction(
          'admin-action',
          {
            action: action === 'approve'
              ? 'approve_landlord'
              : action === 'reject'
                ? 'reject_landlord'
                : 'suspend',
            targetType: 'landlord',
            targetId: landlordId,
            reason: reason || null
          },
          token
        );
      } catch (err) {
        setError(err.message);
      }
    }

    setSelectedIds(new Set());
    await loadLandlords();
  };

  const toggleSelected = (landlordId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(landlordId)) {
        next.delete(landlordId);
      } else {
        next.add(landlordId);
      }
      return next;
    });
  };

  const toggleAll = (checked) => {
    if (!checked) {
      setSelectedIds(new Set());
      return;
    }

    setSelectedIds(new Set(landlords.map((landlord) => landlord.id)));
  };

  const moderateSelected = (action) => {
    if (selectedIds.size === 0) return;
    openModal(action, null, true);
  };

  return (
    <div className="container section">
      <div className="section__header">
        <div>
          <h1>Landlord Review Queue</h1>
          <p>Approve, reject, or suspend lister accounts.</p>
        </div>
      </div>

      {loading ? <p className="muted">Loading queue...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      <section className="card">
        <div className="moderation-toolbar">
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={landlords.length > 0 && selectedIds.size === landlords.length}
              onChange={(event) => toggleAll(event.target.checked)}
            />
            Select all ({selectedIds.size})
          </label>
          <div className="moderation-toolbar__actions">
            <button className="btn btn--small" onClick={() => moderateSelected('approve')} disabled={selectedIds.size === 0}>
              Bulk approve
            </button>
            <button
              className="btn btn--small btn--secondary"
              onClick={() => moderateSelected('reject')}
              disabled={selectedIds.size === 0}
            >
              Bulk reject
            </button>
            <button className="btn btn--small btn--danger" onClick={() => moderateSelected('suspend')} disabled={selectedIds.size === 0}>
              Bulk suspend
            </button>
          </div>
        </div>

        {landlords.length === 0 ? <p className="muted">No listers found.</p> : null}

        {landlords.map((landlord) => (
          <article key={landlord.id} className="moderation-card">
            <div>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={selectedIds.has(landlord.id)}
                  onChange={() => toggleSelected(landlord.id)}
                />
                Select
              </label>
              <p>
                <strong>{landlord.full_name || 'Unnamed lister'}</strong>
              </p>
              <p>Phone: {landlord.phone || 'Not set'}</p>
              <p>Lister type: {landlord.lister_type || 'owner'}</p>
              <p>Status: {normalizeStatus(landlord.verification_status)}</p>
              <p>ID Doc: {landlord.id_doc_url ? 'Uploaded' : 'Missing'}</p>
              <p>Selfie: {landlord.selfie_url ? 'Uploaded' : 'Missing'}</p>
            </div>

            <div className="moderation-card__actions">
              <button className="btn" onClick={() => openModal('approve', landlord.id, false)}>
                Approve
              </button>
              <button className="btn btn--secondary" onClick={() => openModal('reject', landlord.id, false)}>
                Reject
              </button>
              <button className="btn btn--danger" onClick={() => openModal('suspend', landlord.id, false)}>
                Suspend
              </button>
            </div>
          </article>
        ))}
      </section>

      <ModerationModal
        isOpen={modalState.isOpen}
        onClose={handleModalClose}
        onSubmit={handleModalSubmit}
        title={
          modalState.action === 'reject'
            ? 'Reject Landlord'
            : modalState.action === 'suspend'
              ? 'Suspend Landlord'
              : 'Moderate'
        }
        templates={REASON_TEMPLATES[modalState.action] || []}
        targetText={
          modalState.isBulk
            ? `${selectedIds.size} selected landlords`
            : landlords.find(l => l.id === modalState.targetId)?.full_name || 'Selected landlord'
        }
      />
    </div>
  );
}
