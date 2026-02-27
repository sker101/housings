import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  deleteRows,
  insertRows,
  invokeFunction,
  publicObjectUrl,
  selectRows,
  upsertRows,
  uploadPublicObject
} from '../lib/supabase';

const STEPS = [
  { key: 'identity', label: 'Identity' },
  { key: 'basics', label: 'Basics' },
  { key: 'location', label: 'Location & Price' },
  { key: 'amenities', label: 'Amenities & Rules' },
  { key: 'photos', label: 'Photos & Review' }
];

const REQUIRED_PHOTOS = [
  { key: 'bedroom', label: 'Bedroom' },
  { key: 'kitchen', label: 'Kitchen' },
  { key: 'bathroom', label: 'Bathroom' },
  { key: 'outside', label: 'Outside' }
];

const DEFAULT_FORM = {
  fullName: '',
  phone: '',
  listerType: 'owner',
  title: '',
  description: '',
  roomType: 'single',
  genderPreference: 'any',
  availableFrom: '',
  region: 'Dar es Salaam',
  district: '',
  ward: '',
  street: '',
  lat: '',
  lng: '',
  university: 'UDSM',
  priceMonthly: '',
  utilitiesIncluded: false,
  amenities: {
    wifi: false,
    water: false,
    electricity: false,
    generator: false,
    security: false,
    parking: false
  },
  houseRules: '',
  policyAccepted: false
};

function validateStep(step, form, files) {
  if (step === 0) {
    if (!form.fullName.trim()) {
      return 'Full legal name is required.';
    }
    if (!/^\+?[0-9]{9,15}$/.test(form.phone.trim())) {
      return 'Valid phone number is required.';
    }
  }

  if (step === 1) {
    if (form.title.trim().length < 8) {
      return 'Listing title must be at least 8 characters.';
    }
    if (form.description.trim().length < 40) {
      return 'Description must be at least 40 characters.';
    }
  }

  if (step === 2) {
    if (!form.region || !form.district || !form.ward || !form.street) {
      return 'Region, district, ward, and street are required.';
    }
    if (!form.priceMonthly || Number(form.priceMonthly) < 50000) {
      return 'Monthly rent must be at least 50,000 TZS.';
    }
  }

  if (step === 3) {
    if (!form.houseRules.trim()) {
      return 'House rules are required.';
    }
  }

  if (step === 4) {
    for (const requirement of REQUIRED_PHOTOS) {
      if (!files[requirement.key]) {
        return `Upload ${requirement.label} photo.`;
      }
    }

    if (!form.policyAccepted) {
      return 'You must accept platform policy before submission.';
    }
  }

  return '';
}

export default function ListPropertyPage() {
  const navigate = useNavigate();
  const { user, token, refreshMe } = useAuth();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [files, setFiles] = useState({
    bedroom: null,
    kitchen: null,
    bathroom: null,
    outside: null
  });
  const [loadingDraft, setLoadingDraft] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const hasListerRole = user?.role === 'LISTER';

  useEffect(() => {
    let mounted = true;

    async function restoreDraft() {
      if (!user?.userId || !token || !hasListerRole) {
        setLoadingDraft(false);
        return;
      }

      try {
        const drafts = await selectRows('listing_drafts', {
          select: 'lister_id,current_step,data',
          filters: [{ column: 'lister_id', op: 'eq', value: user.userId }],
          limit: 1,
          accessToken: token
        });

        if (!mounted) {
          return;
        }

        if (drafts[0]?.data && typeof drafts[0].data === 'object') {
          setForm((prev) => ({ ...prev, ...drafts[0].data }));
          setStep(
            Math.max(0, Math.min(Number(drafts[0].current_step || 1) - 1, STEPS.length - 1))
          );
          setSuccess('Draft restored from cloud. Upload photos again if needed.');
        } else {
          setForm((prev) => ({
            ...prev,
            fullName: user?.fullName || prev.fullName,
            phone: user?.phone || prev.phone
          }));
        }
      } catch (err) {
        if (mounted) {
          setError(err.message);
        }
      } finally {
        if (mounted) {
          setLoadingDraft(false);
        }
      }
    }

    restoreDraft();

    return () => {
      mounted = false;
    };
  }, [user?.userId, user?.fullName, user?.phone, token, hasListerRole]);

  useEffect(() => {
    let cancelled = false;

    async function saveDraft() {
      if (!user?.userId || !token || !hasListerRole || loadingDraft) {
        return;
      }

      setSavingDraft(true);
      try {
        await upsertRows(
          'listing_drafts',
          {
            lister_id: user.userId,
            current_step: step + 1,
            data: form
          },
          { accessToken: token, onConflict: 'lister_id' }
        );
      } catch {
        // Ignore autosave errors silently to avoid noisy UX.
      } finally {
        if (!cancelled) {
          setSavingDraft(false);
        }
      }
    }

    const timeoutId = setTimeout(saveDraft, 500);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [form, step, user?.userId, token, hasListerRole, loadingDraft]);

  const checklist = useMemo(() => {
    return STEPS.map((stepMeta, index) => {
      const issue = validateStep(index, form, files);
      return {
        ...stepMeta,
        done: !issue,
        issue
      };
    });
  }, [form, files]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateAmenity = (key) => {
    setForm((prev) => ({
      ...prev,
      amenities: {
        ...prev.amenities,
        [key]: !prev.amenities[key]
      }
    }));
  };

  const updatePhoto = (key, file) => {
    setFiles((prev) => ({ ...prev, [key]: file || null }));
  };

  const goNext = () => {
    const issue = validateStep(step, form, files);
    if (issue) {
      setError(issue);
      return;
    }

    setError('');
    setStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setError('');
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const submitListing = async () => {
    setError('');
    setSuccess('');

    for (let index = 0; index < STEPS.length; index += 1) {
      const issue = validateStep(index, form, files);
      if (issue) {
        setStep(index);
        setError(issue);
        return;
      }
    }

    if (!hasListerRole || !user?.userId || !token) {
      setError('Only authenticated listers can submit listings.');
      return;
    }

    setSubmitting(true);

    let createdListingId = null;

    try {
      await upsertRows(
        'profiles',
        {
          id: user.userId,
          role: 'lister',
          lister_type: form.listerType,
          full_name: form.fullName.trim(),
          phone: form.phone.trim()
        },
        { accessToken: token, onConflict: 'id' }
      );

      const insertedListings = await insertRows(
        'listings',
        {
          lister_id: user.userId,
          title: form.title.trim(),
          description: form.description.trim(),
          room_type: form.roomType,
          gender_preference: form.genderPreference,
          price_monthly: Number(form.priceMonthly),
          utilities_included: form.utilitiesIncluded,
          region: form.region.trim(),
          district: form.district.trim(),
          ward: form.ward.trim(),
          street: form.street.trim(),
          lat: form.lat ? Number(form.lat) : null,
          lng: form.lng ? Number(form.lng) : null,
          amenities: form.amenities,
          house_rules: form.houseRules.trim(),
          available_from: form.availableFrom || null,
          vacancy_status: 'available',
          status: 'pending',
          featured: false,
          promotion_level: 0,
          view_count: 0,
          near_universities: form.university ? [form.university] : []
        },
        { accessToken: token }
      );

      createdListingId = insertedListings?.[0]?.id;
      if (!createdListingId) {
        throw new Error('Unable to create listing.');
      }

      const photoRows = [];

      for (const requirement of REQUIRED_PHOTOS) {
        const file = files[requirement.key];
        const extension = (file?.name?.split('.').pop() || 'jpg').toLowerCase();
        const storagePath = `${user.userId}/${createdListingId}/${requirement.key}-${Date.now()}.${extension}`;

        await uploadPublicObject({
          bucket: 'listing-photos',
          path: storagePath,
          file,
          accessToken: token
        });

        const publicUrl = publicObjectUrl('listing-photos', storagePath);

        let aiVerified = null;
        let aiConfidence = null;

        try {
          const inspectResponse = await invokeFunction(
            'inspect-photo',
            {
              imageUrl: publicUrl,
              expectedAngle: requirement.key.toUpperCase()
            },
            token
          );

          if (typeof inspectResponse?.pass === 'boolean') {
            aiVerified = inspectResponse.pass;
          }
          if (typeof inspectResponse?.confidence === 'number') {
            aiConfidence = inspectResponse.confidence;
          }

          if (inspectResponse?.pass === false) {
            throw new Error(
              `${requirement.label} photo failed AI verification. Upload a clearer matching photo.`
            );
          }
        } catch (inspectError) {
          const message = String(inspectError?.message || '').toLowerCase();

          if (message.includes('failed ai verification')) {
            throw inspectError;
          }

          // If AI function is unavailable, keep submission flow for manual review.
          aiVerified = null;
          aiConfidence = null;
        }

        photoRows.push({
          listing_id: createdListingId,
          angle: requirement.key,
          storage_path: storagePath,
          public_url: publicUrl,
          ai_verified: aiVerified,
          ai_confidence: aiConfidence
        });
      }

      await insertRows('listing_photos', photoRows, { accessToken: token });

      await deleteRows('listing_drafts', {
        filters: [{ column: 'lister_id', op: 'eq', value: user.userId }],
        accessToken: token
      });

      await refreshMe();
      setSuccess('Listing submitted for review. You will be notified after moderation.');
      setTimeout(() => {
        navigate('/landlord');
      }, 800);
    } catch (err) {
      if (createdListingId) {
        try {
          await deleteRows('listings', {
            filters: [{ column: 'id', op: 'eq', value: createdListingId }],
            accessToken: token
          });
        } catch {
          // Best effort cleanup.
        }
      }

      setError(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!hasListerRole) {
    return (
      <div className="container section">
        <section className="card">
          <h1>Lister role required</h1>
          <p>You need a lister account to create listings.</p>
          <Link to="/register/landlord" className="btn">
            Register as lister
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="container section">
      <div className="section__header">
        <div>
          <h1>List Property</h1>
          <p>5-step listing flow with cloud draft autosave.</p>
        </div>
        <p className="muted">{savingDraft ? 'Saving draft...' : 'Draft autosave active'}</p>
      </div>

      <section className="list-flow-checklist">
        {checklist.map((item, index) => (
          <button
            key={item.key}
            type="button"
            className={`list-flow-check ${item.done ? 'is-done' : ''} ${index === step ? 'is-active' : ''}`}
            onClick={() => setStep(index)}
            disabled={submitting}
          >
            <span className="list-flow-check__status">{item.done ? 'Done' : 'Pending'}</span>
            <div>
              <h3>{item.label}</h3>
              <p>{item.issue || 'Complete'}</p>
            </div>
          </button>
        ))}
      </section>

      <section className="card list-flow-panel">
        {step === 0 ? (
          <div className="form-grid">
            <label>
              Full legal name
              <input
                value={form.fullName}
                onChange={(event) => updateField('fullName', event.target.value)}
              />
            </label>

            <label>
              Phone number
              <input
                value={form.phone}
                onChange={(event) => updateField('phone', event.target.value)}
              />
            </label>

            <label>
              Lister type
              <select
                value={form.listerType}
                onChange={(event) => updateField('listerType', event.target.value)}
              >
                <option value="owner">Property owner</option>
                <option value="manager">Property manager</option>
                <option value="dalali">Dalali</option>
              </select>
            </label>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="form-grid">
            <label className="form-grid__full">
              Property title
              <input
                value={form.title}
                onChange={(event) => updateField('title', event.target.value)}
              />
            </label>

            <label>
              Room type
              <select
                value={form.roomType}
                onChange={(event) => updateField('roomType', event.target.value)}
              >
                <option value="single">Single</option>
                <option value="shared">Shared</option>
                <option value="bedsit">Bedsit</option>
                <option value="studio">Studio</option>
                <option value="apartment">Apartment</option>
              </select>
            </label>

            <label>
              Gender preference
              <select
                value={form.genderPreference}
                onChange={(event) => updateField('genderPreference', event.target.value)}
              >
                <option value="any">Any</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </label>

            <label>
              Available from
              <input
                type="date"
                value={form.availableFrom}
                onChange={(event) => updateField('availableFrom', event.target.value)}
              />
            </label>

            <label className="form-grid__full">
              Description
              <textarea
                value={form.description}
                onChange={(event) => updateField('description', event.target.value)}
              />
            </label>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="form-grid">
            <label>
              Region
              <input
                value={form.region}
                onChange={(event) => updateField('region', event.target.value)}
              />
            </label>

            <label>
              District
              <input
                value={form.district}
                onChange={(event) => updateField('district', event.target.value)}
              />
            </label>

            <label>
              Ward
              <input
                value={form.ward}
                onChange={(event) => updateField('ward', event.target.value)}
              />
            </label>

            <label>
              Street
              <input
                value={form.street}
                onChange={(event) => updateField('street', event.target.value)}
              />
            </label>

            <label>
              Latitude
              <input
                value={form.lat}
                onChange={(event) => updateField('lat', event.target.value)}
                placeholder="-6.7924"
              />
            </label>

            <label>
              Longitude
              <input
                value={form.lng}
                onChange={(event) => updateField('lng', event.target.value)}
                placeholder="39.2083"
              />
            </label>

            <label>
              Nearby university
              <select
                value={form.university}
                onChange={(event) => updateField('university', event.target.value)}
              >
                <option value="UDSM">UDSM</option>
                <option value="ARDHI">ARDHI</option>
                <option value="MUHAS">MUHAS</option>
                <option value="IFM">IFM</option>
              </select>
            </label>

            <label>
              Monthly price (TZS)
              <input
                type="number"
                min="50000"
                value={form.priceMonthly}
                onChange={(event) => updateField('priceMonthly', event.target.value)}
              />
            </label>

            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={form.utilitiesIncluded}
                onChange={(event) => updateField('utilitiesIncluded', event.target.checked)}
              />
              Utilities included
            </label>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="form-grid">
            <div className="form-grid__full amenity-grid">
              {Object.keys(form.amenities).map((amenity) => (
                <button
                  key={amenity}
                  type="button"
                  className={`choice-chip ${form.amenities[amenity] ? 'is-active' : ''}`}
                  onClick={() => updateAmenity(amenity)}
                >
                  {amenity}
                </button>
              ))}
            </div>

            <label className="form-grid__full">
              House rules
              <textarea
                value={form.houseRules}
                onChange={(event) => updateField('houseRules', event.target.value)}
                placeholder="Visitors, quiet hours, utility rules..."
              />
            </label>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="form-grid">
            {REQUIRED_PHOTOS.map((item) => (
              <label key={item.key}>
                {item.label} photo
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => updatePhoto(item.key, event.target.files?.[0] || null)}
                />
                <span className="muted">{files[item.key]?.name || 'No file selected'}</span>
              </label>
            ))}

            <label className="checkbox-field form-grid__full">
              <input
                type="checkbox"
                checked={form.policyAccepted}
                onChange={(event) => updateField('policyAccepted', event.target.checked)}
              />
              I accept platform listing policies.
            </label>
          </div>
        ) : null}

        <div className="list-flow-panel__actions">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={goBack}
            disabled={step === 0 || submitting}
          >
            Back
          </button>

          {step < STEPS.length - 1 ? (
            <button type="button" className="btn" onClick={goNext} disabled={submitting}>
              Continue
            </button>
          ) : (
            <button type="button" className="btn" onClick={submitListing} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit listing'}
            </button>
          )}
        </div>
      </section>

      {error ? <p className="error-text">{error}</p> : null}
      {success ? <p className="success-text">{success}</p> : null}
    </div>
  );
}
