import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import imageCompression from 'browser-image-compression';
import { DAR_DISTRICTS, DAR_WARDS, ROOM_TYPES, GENDER_PREFERENCES, UNIVERSITIES } from '../lib/constants';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const formSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  phone: z.string().regex(/^\+?[0-9]{9,15}$/, 'Valid phone required'),
  listerType: z.enum(['owner', 'manager', 'dalali']),

  title: z.string().min(8, 'Title must be at least 8 chars'),
  description: z.string().min(40, 'Description must be at least 40 chars'),
  roomType: z.string(),
  genderPreference: z.string(),
  availableFrom: z.string().optional(),

  region: z.string().min(1, 'Region is required'),
  district: z.string().min(1, 'District is required'),
  ward: z.string().min(1, 'Ward is required'),
  street: z.string().min(1, 'Street is required'),
  lat: z.string().optional(),
  lng: z.string().optional(),
  university: z.string().optional(),
  priceMonthly: z.coerce.number().min(50000, 'Min 50,000 TZS'),
  utilitiesIncluded: z.boolean(),

  amenities: z.record(z.string(), z.boolean()),
  houseRules: z.string().min(5, 'Rules required'),

  policyAccepted: z.boolean().refine(v => v === true, 'Policy must be accepted')
});

// Translating these on the fly in the component
const getSteps = (t) => [
  { key: 'identity', label: t('hostFlow.stepIdentity') },
  { key: 'basics', label: t('hostFlow.stepBasics') },
  { key: 'location', label: t('hostFlow.stepLocation') },
  { key: 'amenities', label: t('hostFlow.stepAmenities') },
  { key: 'photos', label: t('hostFlow.stepPhotos') }
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

function validateStep(step, values, files) {
  // Only evaluate the specific fields for the current step
  const stepFields = {
    0: ['fullName', 'phone', 'listerType'],
    1: ['title', 'description', 'roomType', 'genderPreference', 'availableFrom'],
    2: ['region', 'district', 'ward', 'street', 'priceMonthly'],
    3: ['houseRules'],
    4: ['policyAccepted']
  };

  const fieldsToValidate = stepFields[step] || [];

  // Try to parse the specific subset
  for (const field of fieldsToValidate) {
    const parseResult = formSchema.shape[field]?.safeParse(values[field]);
    if (parseResult && !parseResult.success) {
      return parseResult.error.issues[0].message;
    }
  }

  // Handle files manually outside of Zod for simplicity right now
  if (step === 4) {
    for (const requirement of REQUIRED_PHOTOS) {
      if (!files[requirement.key]) {
        return `Upload ${requirement.label} photo.`;
      }
    }
  }

  return '';
}

export default function ListPropertyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token, refreshMe } = useAuth();
  const { t } = useTranslation();

  const STEPS_LOCALIZED = useMemo(() => getSteps(t), [t]);

  const { register, handleSubmit, watch, setValue, formState: { errors }, reset } = useForm({
    resolver: zodResolver(formSchema) as any,
    defaultValues: DEFAULT_FORM,
    mode: 'onTouched'
  });

  const formValues = watch();

  const [step, setStep] = useState(0);
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
  const [screeningResult, setScreeningResult] = useState(null);

  const hasListerRole = user?.role === 'LISTER';
  const verificationStatus = user?.verificationStatus || 'pending';
  const isVerified = verificationStatus === 'approved';
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function restoreDraft() {
      if (!user?.userId || !token || !hasListerRole) {
        setLoadingDraft(false);
        return;
      }

      try {
        const editId = new URLSearchParams(location.search).get('edit');
        if (editId) {
          const records = await selectRows('listings', {
            select: '*',
            filters: [{ column: 'id', op: 'eq', value: editId }, { column: 'lister_id', op: 'eq', value: user.userId }],
            limit: 1,
            accessToken: token
          });
          if (records && records.length > 0 && mounted) {
            const row = records[0];
            reset({
              ...DEFAULT_FORM,
              title: row.title || '',
              description: row.description || '',
              roomType: row.room_type || 'single',
              genderPreference: row.gender_preference || 'any',
              priceMonthly: String(row.price_monthly || ''),
              region: row.region || 'Dar es Salaam',
              district: row.district || '',
              ward: row.ward || '',
              street: row.street || '',
              lat: row.lat ? String(row.lat) : '',
              lng: row.lng ? String(row.lng) : '',
              utilitiesIncluded: row.utilities_included || false,
              amenities: { ...DEFAULT_FORM.amenities, ...(row.amenities || {}) },
              houseRules: row.house_rules || '',
              availableFrom: row.available_from ? new Date(row.available_from).toISOString().split('T')[0] : '',
              university: (row.near_universities && row.near_universities.length > 0) ? row.near_universities[0] : 'UDSM',
            });
            setStep(0);
            setSuccess('Listing loaded for editing. Please fix the issues and re-upload your photos before submitting.');
            setLoadingDraft(false);
            return;
          }
        }

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
          reset({ ...DEFAULT_FORM, ...drafts[0].data });
          setStep(
            Math.max(0, Math.min(Number(drafts[0].current_step || 1) - 1, STEPS_LOCALIZED.length - 1))
          );
          setSuccess('Draft restored from cloud. Upload photos again if needed.');
        } else {
          reset({
            ...DEFAULT_FORM,
            fullName: user?.fullName || formValues.fullName,
            phone: user?.phone || formValues.phone
          });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userId, user?.fullName, user?.phone, token, hasListerRole, formValues.fullName, formValues.phone, reset, location.search]);

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
            data: formValues
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
  }, [formValues, step, user?.userId, token, hasListerRole, loadingDraft, setSavingDraft]); // Added setSavingDraft

  const checklist = useMemo(() => {
    return STEPS_LOCALIZED.map((stepMeta, index) => {
      const issue = validateStep(index, formValues, files);
      return {
        ...stepMeta,
        done: !issue,
        issue
      };
    });
  }, [formValues, files, STEPS_LOCALIZED]);

  const updateAmenity = (key) => {
    setValue(`amenities.${key}` as any, !formValues.amenities[key], { shouldValidate: true });
  };

  const updatePhoto = (key, file) => {
    setFiles((prev) => ({ ...prev, [key]: file || null }));
  };

  const goNext = () => {
    const issue = validateStep(step, formValues, files);
    if (issue) {
      setError(issue);
      return;
    }

    setError('');
    setStep((prev) => Math.min(prev + 1, STEPS_LOCALIZED.length - 1));
  };

  const goBack = () => {
    setError('');
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const submitListing = async (values) => {
    setError('');
    setSuccess('');

    for (let index = 0; index < STEPS_LOCALIZED.length; index += 1) {
      const issue = validateStep(index, values, files);
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

    if (!isVerified) {
      setError(
        'Your account must be verified by an admin before you can submit listings. ' +
        'Your current verification status is: ' + verificationStatus.toUpperCase() + '. ' +
        'Please wait for admin approval or contact support.'
      );
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
          lister_type: values.listerType,
          full_name: values.fullName.trim(),
          phone: values.phone.trim()
        },
        { accessToken: token, onConflict: 'id' }
      );

      const insertedListings = await insertRows(
        'listings',
        {
          lister_id: user.userId,
          title: values.title.trim(),
          description: values.description.trim(),
          room_type: values.roomType,
          gender_preference: values.genderPreference,
          price_monthly: Number(values.priceMonthly),
          utilities_included: values.utilitiesIncluded,
          region: values.region.trim(),
          district: values.district.trim(),
          ward: values.ward.trim(),
          street: values.street.trim(),
          lat: values.lat ? Number(values.lat) : null,
          lng: values.lng ? Number(values.lng) : null,
          amenities: values.amenities,
          house_rules: values.houseRules.trim(),
          available_from: values.availableFrom || null,
          vacancy_status: 'available',
          status: 'pending',
          featured: false,
          promotion_level: 0,
          view_count: 0,
          near_universities: values.university ? [values.university] : []
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

        const compressOptions = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          initialQuality: 0.8
        };
        const compressedFile = await imageCompression(file, compressOptions);

        await uploadPublicObject({
          bucket: 'listing-photos',
          path: storagePath,
          file: compressedFile,
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

      // ── Run automated screening and show real-time feedback ───────────────
      try {
        const screenResult = await invokeFunction(
          'screen-listing',
          {
            listingId: createdListingId,
            listerId: user.userId,
            listing: {
              title: values.title.trim(),
              description: values.description.trim(),
              price_monthly: Number(values.priceMonthly),
              region: values.region,
              district: values.district,
              ward: values.ward,
              street: values.street,
              lat: values.lat ? Number(values.lat) : null,
              lng: values.lng ? Number(values.lng) : null,
              room_type: values.roomType,
            },
            photos: photoRows,
          },
          token
        );
        setScreeningResult(screenResult);

        if (screenResult?.published) {
          setSuccess('🎉 Your listing passed all checks and is now live!');
        } else {
          setSuccess('');
          setError('Your listing was blocked by automated screening. See the issues below.');
        }
        setSubmitting(false);
        await refreshMe();
        return; // Don't auto-navigate — let the user read the screening result
      } catch {
        // If screening call itself errors, still inform the user the listing was saved
        setSuccess('Listing saved. Automated screening is running in the background.');
      }

      await refreshMe();
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
          <h1>{t('hostFlow.listerRoleRequired')}</h1>
          <p>{t('hostFlow.needListerAccount')}</p>
          <Link to="/register/landlord" className="btn">
            {t('hostFlow.registerAsLister')}
          </Link>
        </section>
      </div>
    );
  }

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setGettingLocation(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setValue('lat', position.coords.latitude.toFixed(6), { shouldValidate: true });
        setValue('lng', position.coords.longitude.toFixed(6), { shouldValidate: true });
        setGettingLocation(false);
        setSuccess('Location captured.');
      },
      (geoError) => {
        setGettingLocation(false);
        setError(`Unable to get location: ${geoError.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };


  return (
    <div className="container section">
      <div className="section__header">
        <div>
          <h1>{t('hostFlow.listPropertyTitle')}</h1>
          <p>{t('hostFlow.listPropertySubtitle')}</p>
        </div>
        <p className="muted">{savingDraft ? t('hostFlow.savingDraft') : t('hostFlow.draftAutosaveActive')}</p>
      </div>

      {/* Verification status banner */}
      {!isVerified ? (
        <div className={`verification-banner verification-banner--${verificationStatus}`}>
          <strong>{t('hostFlow.verification')}: {verificationStatus.toUpperCase()}</strong>
          <span>
            {verificationStatus === 'pending'
              ? t('hostFlow.verificationPending')
              : verificationStatus === 'rejected'
                ? t('hostFlow.verificationRejected')
                : t('hostFlow.verificationInProgress')}
          </span>
        </div>
      ) : null}

      <section className="list-flow-checklist">
        {checklist.map((item, index) => (
          <button
            key={item.key}
            type="button"
            className={`list-flow-check ${item.done ? 'is-done' : ''} ${index === step ? 'is-active' : ''}`}
            onClick={() => setStep(index)}
            disabled={submitting}
          >
            <span className="list-flow-check__status">{item.done ? t('hostFlow.statusDone') : t('hostFlow.statusPending')}</span>
            <div>
              <h3>{item.label}</h3>
              <p>{item.issue || t('hostFlow.statusComplete')}</p>
            </div>
          </button>
        ))}
      </section>

      <section className="card list-flow-panel">
        {step === 0 ? (
          <div className="form-grid">
            <label>
              {t('hostFlow.fullLegalName')}
              <input {...register('fullName')} />
              {errors.fullName && <span className="error-text">{errors.fullName.message}</span>}
            </label>

            <label>
              {t('auth.phone')}
              <input {...register('phone')} />
              {errors.phone && <span className="error-text">{errors.phone.message}</span>}
            </label>

            <label>
              {t('auth.listerType')}
              <select {...register('listerType')}>
                <option value="owner">{t('auth.owner')}</option>
                <option value="manager">{t('auth.manager')}</option>
                <option value="dalali">{t('auth.dalali')}</option>
              </select>
            </label>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="form-grid">
            <label className="form-grid__full">
              {t('hostFlow.propertyTitle')}
              <input {...register('title')} />
              {errors.title && <span className="error-text">{errors.title.message}</span>}
            </label>

            <label>
              {t('hostFlow.roomType')}
              <select {...register('roomType')}>
                {ROOM_TYPES.map(op => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>
              {errors.roomType && <span className="error-text">{errors.roomType.message}</span>}
            </label>

            <label>
              {t('hostFlow.genderPreference')}
              <select {...register('genderPreference')}>
                {GENDER_PREFERENCES.map(op => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>
              {errors.genderPreference && <span className="error-text">{errors.genderPreference.message}</span>}
            </label>

            <label>
              {t('hostFlow.availableFrom')}
              <input type="date" {...register('availableFrom')} />
              {errors.availableFrom && <span className="error-text">{errors.availableFrom.message}</span>}
            </label>

            <label className="form-grid__full">
              {t('hostFlow.description')}
              <textarea {...register('description')} />
              {errors.description && <span className="error-text">{errors.description.message}</span>}
            </label>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="form-grid">
            <label>
              {t('hostFlow.region')}
              <select {...register('region')}>
                <option value="Dar es Salaam">Dar es Salaam</option>
              </select>
              {errors.region && <span className="error-text">{errors.region.message}</span>}
            </label>

            <label>
              {t('hostFlow.district')}
              <select
                {...register('district')}
                onChange={(event) => {
                  setValue('district', event.target.value, { shouldValidate: true });
                  setValue('ward', '');
                }}
              >
                {DAR_DISTRICTS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.district && <span className="error-text">{errors.district.message}</span>}
            </label>

            <label>
              {t('hostFlow.ward')}
              <select {...register('ward')}>
                <option value="">{t('hostFlow.selectWard')}</option>
                {(DAR_WARDS[formValues.district] || []).map((ward) => (
                  <option key={ward} value={ward}>
                    {ward}
                  </option>
                ))}
              </select>
              {errors.ward && <span className="error-text">{errors.ward.message}</span>}
            </label>

            <label>
              {t('hostFlow.street')}
              <input {...register('street')} placeholder={t('hostFlow.streetPlaceholder')} />
              {errors.street && <span className="error-text">{errors.street.message}</span>}
            </label>

            <div className="form-grid__full">
              <button
                type="button"
                className="location-picker-btn"
                onClick={handleGetLocation}
                disabled={gettingLocation}
              >
                {gettingLocation ? t('hostFlow.gettingLocation') : t('hostFlow.useCurrentLocation')}
              </button>
              {formValues.lat && formValues.lng ? (
                <p className="location-coords">
                  {t('hostFlow.coordinates')}: {formValues.lat}, {formValues.lng}
                </p>
              ) : (
                <p className="location-coords">
                  {t('hostFlow.noCoordinates')}
                </p>
              )}
            </div>

            <details className="form-grid__full form-grid__collapsible">
              <summary>{t('hostFlow.enterCoordinatesManually')}</summary>
              <div className="form-grid" style={{ marginTop: '0.5rem' }}>
                <label>
                  {t('hostFlow.latitude')}
                  <input {...register('lat')} placeholder="-6.7924" />
                </label>
                <label>
                  {t('hostFlow.longitude')}
                  <input {...register('lng')} placeholder="39.2083" />
                </label>
              </div>
            </details>

            <label>
              {t('hostFlow.nearbyUniversity')}
              <select {...register('university')}>
                {UNIVERSITIES.map(op => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>
            </label>

            <label>
              {t('hostFlow.monthlyPrice')}
              <input type="number" min="50000" {...register('priceMonthly')} />
              {errors.priceMonthly && <span className="error-text">{errors.priceMonthly.message}</span>}
            </label>

            <label className="checkbox-field">
              <input type="checkbox" {...register('utilitiesIncluded')} />
              {t('hostFlow.utilitiesIncluded')}
            </label>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="form-grid">
            <div className="form-grid__full amenity-grid">
              {Object.keys(DEFAULT_FORM.amenities).map((amenity) => (
                <button
                  key={amenity}
                  type="button"
                  className={`choice-chip ${formValues.amenities?.[amenity] ? 'is-active' : ''}`}
                  onClick={() => updateAmenity(amenity)}
                >
                  {amenity}
                </button>
              ))}
            </div>

            <label className="form-grid__full">
              {t('hostFlow.houseRules')}
              <textarea {...register('houseRules')} placeholder={t('hostFlow.houseRulesPlaceholder')} />
              {errors.houseRules && <span className="error-text">{errors.houseRules.message}</span>}
            </label>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="form-grid">
            {REQUIRED_PHOTOS.map((item) => (
              <label key={item.key}>
                {item.label} {t('hostFlow.photo')}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => updatePhoto(item.key, event.target.files?.[0] || null)}
                />
                <span className="muted">{files[item.key]?.name || t('hostFlow.noFileSelected')}</span>
              </label>
            ))}

            <label className="checkbox-field form-grid__full">
              <input type="checkbox" {...register('policyAccepted')} />
              {t('hostFlow.acceptPolicies')}
              {errors.policyAccepted && <span className="error-text" style={{ display: 'block' }}>{errors.policyAccepted.message}</span>}
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
            {t('hostFlow.btnBack')}
          </button>

          {step < STEPS_LOCALIZED.length - 1 ? (
            <button type="button" className="btn" onClick={goNext} disabled={submitting}>
              {t('hostFlow.btnContinue')}
            </button>
          ) : (
            <button
              type="button"
              className="btn"
              onClick={handleSubmit(submitListing)}
              disabled={submitting || !isVerified}
              title={!isVerified ? 'Account verification required to submit' : ''}
            >
              {submitting ? t('hostFlow.btnSubmitting') : !isVerified ? t('hostFlow.btnVerificationRequired') : t('hostFlow.btnSubmitListing')}
            </button>
          )}
        </div>
      </section>

      {error && !screeningResult ? <p className="error-text">{error}</p> : null}
      {success && !screeningResult ? <p className="success-text">{success}</p> : null}

      {screeningResult ? (
        <section className="card" style={{ marginTop: '1rem', border: screeningResult.published ? '1px solid #B8DFC8' : '1px solid #F5C6C2', background: screeningResult.published ? '#EDF7F1' : '#FEF2F1' }}>
          <h2 style={{ marginBottom: '0.5rem' }}>
            {screeningResult.published ? t('hostFlow.listingLive') : t('hostFlow.listingBlocked')}
          </h2>
          <p style={{ marginBottom: '1rem', color: 'var(--mid)' }}>
            {screeningResult.published
              ? t('hostFlow.liveSubtitle')
              : t('hostFlow.blockedSubtitle')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
            {screeningResult.checks?.map((check) => (
              <div key={check.check_type} style={{
                display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
                padding: '0.6rem 0.75rem',
                background: 'white',
                borderRadius: '8px',
                border: `1px solid ${check.result === 'block' ? '#F5C6C2' : check.result === 'warn' ? '#FCD34D' : '#B8DFC8'}`,
              }}>
                <span style={{ fontSize: '1.1rem' }}>
                  {check.result === 'block' ? '🔴' : check.result === 'warn' ? '🟡' : '🟢'}
                </span>
                <div>
                  <strong style={{ fontSize: '0.85rem', textTransform: 'capitalize' }}>
                    {String(check.check_type).replace(/_/g, ' ')}
                  </strong>
                  {check.result !== 'pass' ? (
                    <p style={{ fontSize: '0.8rem', color: '#6B6B5A', margin: '2px 0 0' }}>
                      {check.detail}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link to="/landlord" className="btn">
              {screeningResult.published ? t('hostFlow.viewLiveListing') : t('hostFlow.goToDashboard')}
            </Link>
            {!screeningResult.published ? (
              <button type="button" className="btn btn--ghost" onClick={() => { setScreeningResult(null); setError(''); setStep(1); }}>
                {t('hostFlow.editAndResubmit')}
              </button>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
