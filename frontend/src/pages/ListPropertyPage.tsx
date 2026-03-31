import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
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
import {
  DAR_DISTRICTS,
  DAR_WARDS,
  ROOM_TYPES,
  GENDER_PREFERENCES,
  UNIVERSITIES,
  AMENITIES_LIST,
  PROPERTY_TYPES,
  FLOOR_OPTIONS,
  PAYMENT_SCHEDULES
} from '../lib/constants';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const formSchema = z.object({
  // Step 0: Identity
  fullName: z.string().min(2, 'Full name is required'),
  phone: z.string().regex(/^\+?[0-9]{9,15}$/, 'Valid phone required'),
  listerType: z.enum(['owner', 'manager', 'dalali']),
  ownerName: z.string().optional(),
  ownerPhone: z.string().optional(),
  whatsappNumber: z.string().optional(),

  // Step 1: Basics
  title: z.string().min(8, 'Title must be at least 8 chars'),
  description: z.string().min(40, 'Description must be at least 40 chars'),
  roomType: z.string(),
  propertyType: z.string().optional(),
  floor: z.string().optional(),
  totalRooms: z.coerce.number().min(1).max(200).optional(),
  furnished: z.boolean(),
  genderPreference: z.string(),
  availableFrom: z.string().optional(),

  // Step 2: Pricing
  priceMonthly: z.coerce.number().min(50000, 'Min 50,000 TZS'),
  securityDeposit: z.coerce.number().min(0).optional(),
  minLeaseMonths: z.coerce.number().min(1).max(24),
  paymentSchedule: z.enum(['monthly', 'quarterly', 'annually']),
  lateFeePolicy: z.string().optional(),
  utilitiesIncluded: z.boolean(),

  // Step 3: Location
  region: z.string().min(1, 'Region is required'),
  district: z.string().min(1, 'District is required'),
  ward: z.string().min(1, 'Ward is required'),
  street: z.string().min(1, 'Street is required'),
  lat: z.string().optional(),
  lng: z.string().optional(),
  university: z.string().optional(),
  accessibilityNotes: z.string().optional(),

  // Step 4: Amenities
  amenities: z.record(z.string(), z.boolean()),
  houseRules: z.string().min(5, 'Rules required'),

  // Step 5: Photos & Video
  videoTourUrl: z.string().url().optional().or(z.literal('')),

  // Step 6: Review & Submit
  policyAccepted: z.boolean().refine(v => v === true, 'Policy must be accepted')
});


type FormValues = z.infer<typeof formSchema>;

const PHOTO_SLOTS = [
  { key: 'bedroom', label: 'Bedroom', required: true },
  { key: 'kitchen', label: 'Kitchen', required: true },
  { key: 'bathroom', label: 'Bathroom', required: true },
  { key: 'outside', label: 'Outside', required: true },
  { key: 'extra1', label: 'Extra Photo 1', required: false },
  { key: 'extra2', label: 'Extra Photo 2', required: false },
  { key: 'extra3', label: 'Extra Photo 3', required: false },
  { key: 'extra4', label: 'Extra Photo 4', required: false },
  { key: 'extra5', label: 'Extra Photo 5', required: false },
  { key: 'extra6', label: 'Extra Photo 6', required: false },
];

const DEFAULT_AMENITIES = Object.fromEntries(
  AMENITIES_LIST.map(a => [a.key, false])
);

const DEFAULT_FORM: Partial<FormValues> = {
  fullName: '',
  phone: '',
  listerType: 'owner',
  ownerName: '',
  ownerPhone: '',
  whatsappNumber: '',
  title: '',
  description: '',
  roomType: 'single',
  propertyType: '',
  floor: '',
  totalRooms: undefined,
  furnished: false,
  genderPreference: 'any',
  availableFrom: '',
  priceMonthly: '',
  securityDeposit: '',
  minLeaseMonths: 1,
  paymentSchedule: 'monthly',
  lateFeePolicy: '',
  utilitiesIncluded: false,
  region: 'Dar es Salaam',
  district: '',
  ward: '',
  street: '',
  lat: '',
  lng: '',
  university: 'UDSM',
  accessibilityNotes: '',
  amenities: DEFAULT_AMENITIES,
  houseRules: '',
  videoTourUrl: '',
  policyAccepted: false
};

const STEPS = [
  { key: 'identity', label: 'Identity & Contacts', description: 'Your details and contact information' },
  { key: 'basics', label: 'Room Basics', description: 'Type, description, and property facts' },
  { key: 'pricing', label: 'Pricing & Lease', description: 'Rent, deposit, and payment terms' },
  { key: 'location', label: 'Location', description: 'Address and GPS coordinates' },
  { key: 'amenities', label: 'Amenities & Rules', description: 'What\'s included and house rules' },
  { key: 'photos', label: 'Photos & Video', description: 'Up to 10 photos and optional video tour' },
  { key: 'review', label: 'Review & Submit', description: 'Summary and final submission' }
];

function validateStep(step: number, values: any, files: any): string {
  const stepValidations: Record<number, () => string> = {
    0: () => {
      if (!values.fullName || values.fullName.length < 2) return 'Full name is required';
      if (!values.phone) return 'Phone is required';
      if (values.listerType === 'dalali' && (!values.ownerName || !values.ownerPhone)) {
        return 'Owner details required for Dalali listings';
      }
      return '';
    },
    1: () => {
      if (!values.title || values.title.length < 8) return 'Title must be at least 8 chars';
      if (!values.description || values.description.length < 40) return 'Description must be at least 40 chars';
      if (!values.roomType) return 'Room type is required';
      return '';
    },
    2: () => {
      if (!values.priceMonthly || Number(values.priceMonthly) < 50000) return 'Price must be at least 50,000 TZS';
      if (!values.minLeaseMonths || Number(values.minLeaseMonths) < 1) return 'Minimum lease is required';
      return '';
    },
    3: () => {
      if (!values.region) return 'Region is required';
      if (!values.district) return 'District is required';
      if (!values.ward) return 'Ward is required';
      if (!values.street) return 'Street is required';
      return '';
    },
    4: () => {
      if (!values.houseRules || values.houseRules.length < 5) return 'House rules are required';
      const selectedAmenities = Object.values(values.amenities || {}).filter(Boolean);
      if (selectedAmenities.length === 0) return 'Select at least one amenity';
      return '';
    },
    5: () => {
      const requiredPhotos = PHOTO_SLOTS.filter(p => p.required);
      for (const photo of requiredPhotos) {
        if (!files[photo.key]) return `${photo.label} photo is required`;
      }
      const uploadedCount = Object.values(files).filter(f => f).length;
      if (uploadedCount < 4 || uploadedCount > 10) return 'Upload 4-10 photos';
      return '';
    },
    6: () => {
      if (!values.policyAccepted) return 'You must accept the policy';
      return '';
    }
  };

  return (stepValidations[step] || (() => ''))();
}

export default function ListPropertyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token, refreshMe } = useAuth();

  const { register, handleSubmit, watch, setValue, formState: { errors }, reset } = useForm({
    resolver: zodResolver(formSchema) as any,
    defaultValues: DEFAULT_FORM,
    mode: 'onTouched'
  });

  const formValues = watch();
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState<Record<string, File | null>>(
    Object.fromEntries(PHOTO_SLOTS.map(p => [p.key, null]))
  );
  const [loadingDraft, setLoadingDraft] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [screeningResult, setScreeningResult] = useState<any>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  const hasListerRole = user?.role === 'LISTER';
  const verificationStatus = user?.verificationStatus || 'pending';
  const isVerified = verificationStatus === 'approved';

  // Load draft on mount
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
            filters: [
              { column: 'id', op: 'eq', value: editId },
              { column: 'lister_id', op: 'eq', value: user.userId }
            ],
            limit: 1,
            accessToken: token
          });

          if (records?.length > 0 && mounted) {
            const row = records[0];
            reset({
              ...DEFAULT_FORM,
              fullName: row.full_name || user?.fullName || '',
              phone: user?.phone || '',
              title: row.title || '',
              description: row.description || '',
              roomType: row.room_type || 'single',
              propertyType: row.property_type || '',
              floor: row.floor || '',
              totalRooms: row.total_rooms || undefined,
              furnished: row.furnished || false,
              genderPreference: row.gender_preference || 'any',
              priceMonthly: String(row.price_monthly || ''),
              securityDeposit: String(row.security_deposit || ''),
              minLeaseMonths: row.min_lease_months || 1,
              paymentSchedule: row.payment_schedule || 'monthly',
              lateFeePolicy: row.late_fee_policy || '',
              utilitiesIncluded: row.utilities_included || false,
              region: row.region || 'Dar es Salaam',
              district: row.district || '',
              ward: row.ward || '',
              street: row.street || '',
              lat: row.lat ? String(row.lat) : '',
              lng: row.lng ? String(row.lng) : '',
              university: (row.near_universities?.[0]) || 'UDSM',
              accessibilityNotes: row.accessibility_notes || '',
              amenities: { ...DEFAULT_AMENITIES, ...(row.amenities || {}) },
              houseRules: row.house_rules || '',
              videoTourUrl: row.video_tour_url || '',
              availableFrom: row.available_from ? new Date(row.available_from).toISOString().split('T')[0] : '',
              ownerName: row.owner_name || '',
              ownerPhone: row.owner_phone || '',
              whatsappNumber: row.whatsapp_number || ''
            });
            setSuccess('Listing loaded for editing. Please update and re-submit.');
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

        if (!mounted) return;

        if (drafts[0]?.data && typeof drafts[0].data === 'object') {
          reset({ ...DEFAULT_FORM, ...drafts[0].data });
          setStep(Math.max(0, Math.min(Number(drafts[0].current_step || 1) - 1, STEPS.length - 1)));
          setSuccess('Draft restored from cloud.');
        } else {
          reset({
            ...DEFAULT_FORM,
            fullName: user?.fullName || '',
            phone: user?.phone || ''
          });
        }
      } catch (err: any) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoadingDraft(false);
      }
    }

    restoreDraft();
    return () => { mounted = false; };
  }, [user?.userId, user?.fullName, user?.phone, token, hasListerRole, reset, location.search]);

  // Auto-save draft
  useEffect(() => {
    let cancelled = false;

    async function saveDraft() {
      if (!user?.userId || !token || !hasListerRole || loadingDraft) return;

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
        // Silent fail for autosave
      } finally {
        if (!cancelled) setSavingDraft(false);
      }
    }

    const timeoutId = setTimeout(saveDraft, 500);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [formValues, step, user?.userId, token, hasListerRole, loadingDraft]);

  const currentError = validateStep(step, formValues, files);
  const progressPct = Math.round(((step + 1) / STEPS.length) * 100);

  const goNext = () => {
    const issue = validateStep(step, formValues, files);
    if (issue) {
      setError(issue);
      return;
    }
    setError('');
    setStep(prev => Math.min(prev + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setError('');
    setStep(prev => Math.max(prev - 1, 0));
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }
    setGettingLocation(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setValue('lat', position.coords.latitude.toFixed(6));
        setValue('lng', position.coords.longitude.toFixed(6));
        setGettingLocation(false);
        setSuccess('Location captured');
      },
      () => {
        setGettingLocation(false);
        setError('Unable to get location');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const updateAmenity = (key: string) => {
    setValue(`amenities.${key}` as any, !formValues.amenities[key], { shouldValidate: true });
  };

  const submitListing = async (values: FormValues) => {
    setError('');
    setSuccess('');

    // Validate all steps
    for (let i = 0; i < STEPS.length; i++) {
      const issue = validateStep(i, values, files);
      if (issue) {
        setStep(i);
        setError(issue);
        return;
      }
    }

    if (!hasListerRole || !user?.userId || !token) {
      setError('Only authenticated listers can submit listings');
      return;
    }

    setSubmitting(true);
    let createdListingId = null;

    try {
      // Update profile
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

      // Create listing
      const insertedListings = await insertRows(
        'listings',
        {
          lister_id: user.userId,
          title: values.title.trim(),
          description: values.description.trim(),
          room_type: values.roomType,
          property_type: values.propertyType || null,
          floor: values.floor || null,
          total_rooms: values.totalRooms || null,
          furnished: values.furnished,
          gender_preference: values.genderPreference,
          price_monthly: Number(values.priceMonthly),
          security_deposit: values.securityDeposit ? Number(values.securityDeposit) : null,
          utilities_included: values.utilitiesIncluded,
          min_lease_months: Number(values.minLeaseMonths) || 1,
          payment_schedule: values.paymentSchedule,
          late_fee_policy: values.lateFeePolicy?.trim() || null,
          owner_name: values.ownerName?.trim() || null,
          owner_phone: values.ownerPhone?.trim() || null,
          whatsapp_number: values.whatsappNumber?.trim() || null,
          video_tour_url: values.videoTourUrl?.trim() || null,
          accessibility_notes: values.accessibilityNotes?.trim() || null,
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
          view_count: 0,
          near_universities: values.university ? [values.university] : []
        },
        { accessToken: token }
      );

      createdListingId = insertedListings?.[0]?.id;
      if (!createdListingId) throw new Error('Unable to create listing');

      // Upload photos
      const photoRows = [];
      let photoIndex = 0;

      for (const slot of PHOTO_SLOTS) {
        const file = files[slot.key];
        if (!file) continue;

        const extension = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const storagePath = `${user.userId}/${createdListingId}/${slot.key}-${Date.now()}.${extension}`;

        const compressedFile = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          initialQuality: 0.8
        });

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
              expectedAngle: slot.label.toUpperCase()
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
            throw new Error(`${slot.label} photo failed AI verification`);
          }
        } catch (inspectError: any) {
          const message = String(inspectError?.message || '').toLowerCase();
          if (message.includes('failed ai verification')) {
            throw inspectError;
          }
          aiVerified = null;
          aiConfidence = null;
        }

        photoRows.push({
          listing_id: createdListingId,
          angle: slot.key,
          storage_path: storagePath,
          public_url: publicUrl,
          position: photoIndex,
          is_cover: photoIndex === 0,
          ai_verified: aiVerified,
          ai_confidence: aiConfidence
        });

        photoIndex++;
      }

      await insertRows('listing_photos', photoRows, { accessToken: token });

      // Clean up draft
      await deleteRows('listing_drafts', {
        filters: [{ column: 'lister_id', op: 'eq', value: user.userId }],
        accessToken: token
      });

      // Run screening
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
          setSuccess('🎉 Your listing is now live!');
        } else {
          setError('Your listing was blocked during review. See details below.');
        }
        setSubmitting(false);
        await refreshMe();
        return;
      } catch {
        setSuccess('Listing saved. Screening is running in the background.');
        await refreshMe();
        setTimeout(() => navigate('/landlord'), 800);
      }
    } catch (err: any) {
      if (createdListingId) {
        try {
          await deleteRows('listings', {
            filters: [{ column: 'id', op: 'eq', value: createdListingId }],
            accessToken: token
          });
        } catch {
          // Best effort cleanup
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
          <h1>Lister Account Required</h1>
          <p>You need a lister account to post properties.</p>
          <Link to="/register/landlord" className="btn">Register as Lister</Link>
        </section>
      </div>
    );
  }

  if (loadingDraft) {
    return <div className="container section"><p>Loading...</p></div>;
  }

  return (
    <div className="container section">
      <div className="section__header">
        <div>
          <h1>List Your Property</h1>
          <p>Step {step + 1} of {STEPS.length} • {progressPct}%</p>
        </div>
        <p className="muted">{savingDraft ? 'Saving draft...' : 'Draft autosave active'}</p>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem' }}>
        {STEPS.map((s, i) => (
          <div
            key={s.key}
            style={{
              flex: 1,
              height: '6px',
              background: i <= step ? '#1D9E75' : '#E5E5E0',
              borderRadius: '3px',
              transition: 'all 0.3s'
            }}
          />
        ))}
      </div>

      {/* Verification banner */}
      {!isVerified && (
        <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem', color: '#92400E' }}>
          <strong>Account Status: {verificationStatus.toUpperCase()}</strong>
          <p style={{ margin: '0.5rem 0 0' }}>Optional: Get verified to build trust with tenants and improve visibility.</p>
        </div>
      )}

      {error && <p style={{ color: '#C0392B', marginBottom: '1rem' }}>⚠️ {error}</p>}
      {success && <p style={{ color: '#1D9E75', marginBottom: '1rem' }}>✓ {success}</p>}

      <section className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: '0 0 0.5rem' }}>{STEPS[step].label}</h2>
        <p style={{ margin: '0 0 1.5rem', color: '#6B6B5A' }}>{STEPS[step].description}</p>

        {/* Step 0: Identity */}
        {step === 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <label>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.4rem', color: '#1A1A2E' }}>Full Name</div>
              <input {...register('fullName')} placeholder="Your full name" style={{ width: '100%', padding: '0.6rem', border: '1px solid #E5E5E0', borderRadius: '8px' }} />
              {errors.fullName && <span style={{ color: '#C0392B', fontSize: '0.85rem' }}>{errors.fullName.message}</span>}
            </label>

            <label>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.4rem', color: '#1A1A2E' }}>Phone</div>
              <input {...register('phone')} placeholder="+255" style={{ width: '100%', padding: '0.6rem', border: '1px solid #E5E5E0', borderRadius: '8px' }} />
              {errors.phone && <span style={{ color: '#C0392B', fontSize: '0.85rem' }}>{errors.phone.message}</span>}
            </label>

            <label style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.4rem', color: '#1A1A2E' }}>Lister Type</div>
              <select {...register('listerType')} style={{ width: '100%', padding: '0.6rem', border: '1px solid #E5E5E0', borderRadius: '8px' }}>
                <option value="owner">Property Owner</option>
                <option value="manager">Property Manager</option>
                <option value="dalali">Dalali (Broker)</option>
              </select>
            </label>

            {formValues.listerType === 'dalali' && (
              <>
                <label>
                  <div style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.4rem', color: '#1A1A2E' }}>Owner Name*</div>
                  <input {...register('ownerName')} placeholder="Property owner's full name" style={{ width: '100%', padding: '0.6rem', border: '1px solid #E5E5E0', borderRadius: '8px' }} />
                </label>
                <label>
                  <div style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.4rem', color: '#1A1A2E' }}>Owner Phone*</div>
                  <input {...register('ownerPhone')} placeholder="Owner's phone number" style={{ width: '100%', padding: '0.6rem', border: '1px solid #E5E5E0', borderRadius: '8px' }} />
                </label>
              </>
            )}

            <label style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.4rem', color: '#1A1A2E' }}>WhatsApp Number (optional)</div>
              <input {...register('whatsappNumber')} placeholder="+255" style={{ width: '100%', padding: '0.6rem', border: '1px solid #E5E5E0', borderRadius: '8px' }} />
            </label>
          </div>
        )}

        {/* Step 1: Basics */}
        {step === 1 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <label style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.4rem', color: '#1A1A2E' }}>Property Title</div>
              <input {...register('title')} placeholder="e.g., Modern self-contained near UDSM" style={{ width: '100%', padding: '0.6rem', border: '1px solid #E5E5E0', borderRadius: '8px' }} />
              {errors.title && <span style={{ color: '#C0392B', fontSize: '0.85rem' }}>{errors.title.message}</span>}
            </label>

            <label>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.4rem', color: '#1A1A2E' }}>Room Type</div>
              <select {...register('roomType')} style={{ width: '100%', padding: '0.6rem', border: '1px solid #E5E5E0', borderRadius: '8px' }}>
                {ROOM_TYPES.map(op => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>
            </label>

            <label>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.4rem', color: '#1A1A2E' }}>Property Type</div>
              <select {...register('propertyType')} style={{ width: '100%', padding: '0.6rem', border: '1px solid #E5E5E0', borderRadius: '8px' }}>
                <option value="">Select type</option>
                {PROPERTY_TYPES.map(op => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>
            </label>

            <label>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.4rem', color: '#1A1A2E' }}>Floor</div>
              <select {...register('floor')} style={{ width: '100%', padding: '0.6rem', border: '1px solid #E5E5E0', borderRadius: '8px' }}>
                <option value="">Select floor</option>
                {FLOOR_OPTIONS.map(op => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>
            </label>

            <label>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.4rem', color: '#1A1A2E' }}>Total Rooms in Property</div>
              <input type="number" {...register('totalRooms')} placeholder="e.g., 12" style={{ width: '100%', padding: '0.6rem', border: '1px solid #E5E5E0', borderRadius: '8px' }} />
            </label>

            <label>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.4rem', color: '#1A1A2E' }}>Furnished?</div>
              <select {...register('furnished')} style={{ width: '100%', padding: '0.6rem', border: '1px solid #E5E5E0', borderRadius: '8px' }}>
                <option value="false">Unfurnished</option>
                <option value="true">Furnished</option>
              </select>
            </label>

            <label>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.4rem', color: '#1A1A2E' }}>Gender Preference</div>
              <select {...register('genderPreference')} style={{ width: '100%', padding: '0.6rem', border: '1px solid #E5E5E0', borderRadius: '8px' }}>
                {GENDER_PREFERENCES.map(op => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>
            </label>

            <label>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.4rem', color: '#1A1A2E' }}>Available From</div>
              <input type="date" {...register('availableFrom')} style={{ width: '100%', padding: '0.6rem', border: '1px solid #E5E5E0', borderRadius: '8px' }} />
            </label>

            <label style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.4rem', color: '#1A1A2E' }}>Description</div>
              <textarea {...register('description')} placeholder="Describe the room, location, and what makes it special..." style={{ width: '100%', padding: '0.6rem', border: '1px solid #E5E5E0', borderRadius: '8px', minHeight: '120px' }} />
              {errors.description && <span style={{ color: '#C0392B', fontSize: '0.85rem' }}>{errors.description.message}</span>}
            </label>
          </div>
        )}

        {/* Step 2: Pricing */}
        {step === 2 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <label>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.4rem', color: '#1A1A2E' }}>Monthly Rent (TZS)</div>
              <input type="number" {...register('priceMonthly')} min="50000" placeholder="250000" style={{ width: '100%', padding: '0.6rem', border: '1px solid #E5E5E0', borderRadius: '8px' }} />
              {errors.priceMonthly && <span style={{ color: '#C0392B', fontSize: '0.85rem' }}>{errors.priceMonthly.message}</span>}
            </label>

            <label>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.4rem', color: '#1A1A2E' }}>Security Deposit (TZS, optional)</div>
              <input type="number" {...register('securityDeposit')} min="0" placeholder="250000" style={{ width: '100%', padding: '0.6rem', border: '1px solid #E5E5E0', borderRadius: '8px' }} />
            </label>

            <label>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.4rem', color: '#1A1A2E' }}>Minimum Lease</div>
              <select {...register('minLeaseMonths')} style={{ width: '100%', padding: '0.6rem', border: '1px solid #E5E5E0', borderRadius: '8px' }}>
                <option value="1">1 month</option>
                <option value="2">2 months</option>
                <option value="3">3 months</option>
                <option value="6">6 months</option>
                <option value="12">12 months</option>
              </select>
            </label>

            <label>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.4rem', color: '#1A1A2E' }}>Payment Schedule</div>
              <select {...register('paymentSchedule')} style={{ width: '100%', padding: '0.6rem', border: '1px solid #E5E5E0', borderRadius: '8px' }}>
                {PAYMENT_SCHEDULES.map(op => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>
            </label>

            <label style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.4rem', color: '#1A1A2E' }}>
                <input type="checkbox" {...register('utilitiesIncluded')} style={{ marginRight: '0.5rem' }} />
                Utilities Included in Rent
              </div>
            </label>

            <label style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.4rem', color: '#1A1A2E' }}>Late Fee Policy (optional)</div>
              <textarea {...register('lateFeePolicy')} placeholder="e.g., TZS 5,000 per day after 5-day grace period" style={{ width: '100%', padding: '0.6rem', border: '1px solid #E5E5E0', borderRadius: '8px', minHeight: '80px' }} />
            </label>
          </div>
        )}

        {/* Step 3: Location */}
        {step === 3 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <label>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.4rem', color: '#1A1A2E' }}>Region</div>
              <select {...register('region')} style={{ width: '100%', padding: '0.6rem', border: '1px solid #E5E5E0', borderRadius: '8px' }}>
                <option value="Dar es Salaam">Dar es Salaam</option>
              </select>
            </label>

            <label>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.4rem', color: '#1A1A2E' }}>District</div>
              <select {...register('district')} onChange={(e) => {
                setValue('district', e.target.value);
                setValue('ward', '');
              }} style={{ width: '100%', padding: '0.6rem', border: '1px solid #E5E5E0', borderRadius: '8px' }}>
                {DAR_DISTRICTS.map(op => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>
            </label>

            <label>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.4rem', color: '#1A1A2E' }}>Ward</div>
              <select {...register('ward')} style={{ width: '100%', padding: '0.6rem', border: '1px solid #E5E5E0', borderRadius: '8px' }}>
                <option value="">Select ward</option>
                {(DAR_WARDS[formValues.district as keyof typeof DAR_WARDS] || []).map(w => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </label>

            <label>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.4rem', color: '#1A1A2E' }}>Street / Building</div>
              <input {...register('street')} placeholder="Street name and building number" style={{ width: '100%', padding: '0.6rem', border: '1px solid #E5E5E0', borderRadius: '8px' }} />
            </label>

            <label>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.4rem', color: '#1A1A2E' }}>Nearby University</div>
              <select {...register('university')} style={{ width: '100%', padding: '0.6rem', border: '1px solid #E5E5E0', borderRadius: '8px' }}>
                {UNIVERSITIES.map(op => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>
            </label>

            <div style={{ gridColumn: '1 / -1' }}>
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={gettingLocation}
                style={{
                  width: '100%',
                  padding: '0.6rem',
                  background: '#1D9E75',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                {gettingLocation ? 'Getting location...' : 'Get Current Location'}
              </button>
              {formValues.lat && formValues.lng && (
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: '#6B6B5A' }}>
                  ✓ Coordinates: {formValues.lat}, {formValues.lng}
                </p>
              )}
            </div>

            <details style={{ gridColumn: '1 / -1' }}>
              <summary style={{ cursor: 'pointer', fontWeight: '600', marginBottom: '0.5rem' }}>Enter coordinates manually</summary>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                <label>
                  <div style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.4rem', color: '#1A1A2E' }}>Latitude</div>
                  <input {...register('lat')} placeholder="-6.7924" style={{ width: '100%', padding: '0.6rem', border: '1px solid #E5E5E0', borderRadius: '8px' }} />
                </label>
                <label>
                  <div style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.4rem', color: '#1A1A2E' }}>Longitude</div>
                  <input {...register('lng')} placeholder="39.2083" style={{ width: '100%', padding: '0.6rem', border: '1px solid #E5E5E0', borderRadius: '8px' }} />
                </label>
              </div>
            </details>

            <label style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.4rem', color: '#1A1A2E' }}>Accessibility Notes (optional)</div>
              <textarea {...register('accessibilityNotes')} placeholder="e.g., Ground floor, ramp available, wheelchair friendly" style={{ width: '100%', padding: '0.6rem', border: '1px solid #E5E5E0', borderRadius: '8px', minHeight: '80px' }} />
            </label>
          </div>
        )}

        {/* Step 4: Amenities */}
        {step === 4 && (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div>
              <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem' }}>Select Amenities</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.5rem' }}>
                {AMENITIES_LIST.map(amenity => (
                  <button
                    key={amenity.key}
                    type="button"
                    onClick={() => updateAmenity(amenity.key)}
                    style={{
                      padding: '0.6rem',
                      border: formValues.amenities[amenity.key] ? `2px solid #1D9E75` : `1px solid #E5E5E0`,
                      background: formValues.amenities[amenity.key] ? '#EDF7F1' : 'white',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: formValues.amenities[amenity.key] ? '600' : '400',
                      color: formValues.amenities[amenity.key] ? '#1D9E75' : '#6B6B5A',
                      transition: 'all 0.2s'
                    }}
                  >
                    {amenity.emoji} {amenity.label}
                  </button>
                ))}
              </div>
            </div>

            <label>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.4rem', color: '#1A1A2E' }}>House Rules</div>
              <textarea {...register('houseRules')} placeholder="No smoking&#10;Quiet after 10 PM&#10;No male visitors after 8 PM" style={{ width: '100%', padding: '0.6rem', border: '1px solid #E5E5E0', borderRadius: '8px', minHeight: '120px' }} />
              {errors.houseRules && <span style={{ color: '#C0392B', fontSize: '0.85rem' }}>{errors.houseRules.message}</span>}
            </label>
          </div>
        )}

        {/* Step 5: Photos */}
        {step === 5 && (
          <div style={{ display: 'grid', gap: '1rem' }}>
            <p style={{ color: '#6B6B5A', fontSize: '0.9rem' }}>Upload 4-10 photos. First 4 are required: Bedroom, Kitchen, Bathroom, Outside.</p>

            {PHOTO_SLOTS.map((slot, idx) => (
              <div key={slot.key} style={{
                border: files[slot.key] ? '2px solid #1D9E75' : '2px dashed #E5E5E0',
                borderRadius: '10px',
                padding: '1rem',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}>
                <label style={{ cursor: 'pointer', display: 'block' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.3rem' }}>
                    {slot.label} {slot.required && '*'}
                  </div>
                  {files[slot.key] ? (
                    <div style={{ color: '#1D9E75', fontSize: '0.85rem' }}>✓ {files[slot.key]?.name}</div>
                  ) : (
                    <div style={{ color: '#6B6B5A', fontSize: '0.85rem' }}>Click to upload</div>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setFiles(prev => ({ ...prev, [slot.key]: e.target.files?.[0] || null }))}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            ))}

            <label>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.4rem', color: '#1A1A2E' }}>Video Tour URL (optional)</div>
              <input {...register('videoTourUrl')} placeholder="https://youtube.com/watch?v=..." style={{ width: '100%', padding: '0.6rem', border: '1px solid #E5E5E0', borderRadius: '8px' }} />
              <p style={{ margin: '0.3rem 0 0', color: '#6B6B5A', fontSize: '0.85rem' }}>YouTube or Google Drive link</p>
            </label>
          </div>
        )}

        {/* Step 6: Review */}
        {step === 6 && (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div style={{ background: '#F5F5F0', padding: '1rem', borderRadius: '10px' }}>
              <h3 style={{ margin: '0 0 1rem' }}>Summary</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
                <div><strong>Title:</strong> {formValues.title}</div>
                <div><strong>Type:</strong> {formValues.roomType}</div>
                <div><strong>Location:</strong> {formValues.ward}, {formValues.district}</div>
                <div><strong>Price:</strong> TZS {Number(formValues.priceMonthly).toLocaleString()}/mo</div>
                {formValues.securityDeposit && <div><strong>Deposit:</strong> TZS {Number(formValues.securityDeposit).toLocaleString()}</div>}
                <div><strong>Amenities:</strong> {Object.values(formValues.amenities).filter(Boolean).length} selected</div>
                <div><strong>Photos:</strong> {Object.values(files).filter(Boolean).length} uploaded</div>
                <div><strong>Min Lease:</strong> {formValues.minLeaseMonths} months</div>
              </div>
            </div>

            <label>
              <input type="checkbox" {...register('policyAccepted')} style={{ marginRight: '0.5rem' }} />
              <span style={{ fontSize: '0.9rem' }}>
                I accept the policies and confirm all information is accurate
              </span>
              {errors.policyAccepted && <span style={{ color: '#C0392B', fontSize: '0.85rem', display: 'block' }}>{errors.policyAccepted.message}</span>}
            </label>
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'space-between' }}>
          <button
            type="button"
            onClick={goBack}
            disabled={step === 0 || submitting}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'white',
              border: '1px solid #E5E5E0',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            ← Back
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={submitting}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#1D9E75',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Continue →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit(submitListing)}
              disabled={submitting || !isVerified}
              style={{
                padding: '0.75rem 1.5rem',
                background: isVerified ? '#1D9E75' : '#CCCCCC',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: isVerified ? 'pointer' : 'not-allowed',
                fontWeight: '600'
              }}
            >
              {submitting ? 'Submitting...' : 'Submit Listing'}
            </button>
          )}
        </div>
      </section>

      {screeningResult && (
        <section className="card" style={{
          padding: '1.5rem',
          border: `1px solid ${screeningResult.published ? '#B8DFC8' : '#F5C6C2'}`,
          background: screeningResult.published ? '#EDF7F1' : '#FEF2F1'
        }}>
          <h2 style={{ marginBottom: '0.5rem' }}>
            {screeningResult.published ? '✓ Listing Live!' : '⚠️ Listing Blocked'}
          </h2>
          <p style={{ color: '#6B6B5A', marginBottom: '1rem' }}>
            {screeningResult.published
              ? 'Your listing passed all checks and is now visible to tenants.'
              : 'Your listing was blocked during automated screening. Please review the issues below and resubmit.'}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {screeningResult.checks?.map((check: any) => (
              <div key={check.check_type} style={{
                padding: '0.75rem',
                background: 'white',
                border: `1px solid ${check.result === 'block' ? '#F5C6C2' : '#B8DFC8'}`,
                borderRadius: '8px',
                display: 'flex',
                gap: '0.5rem'
              }}>
                <span>{check.result === 'block' ? '🔴' : '✓'}</span>
                <div>
                  <strong style={{ fontSize: '0.9rem' }}>{String(check.check_type).replace(/_/g, ' ')}</strong>
                  {check.detail && <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#6B6B5A' }}>{check.detail}</p>}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <Link to="/landlord" className="btn" style={{ background: '#1D9E75', color: 'white', textDecoration: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px' }}>
              {screeningResult.published ? 'View Listing' : 'Go to Dashboard'}
            </Link>
            {!screeningResult.published && (
              <button
                type="button"
                onClick={() => { setScreeningResult(null); setError(''); setStep(1); }}
                style={{
                  background: 'white',
                  border: '1px solid #E5E5E0',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Edit & Resubmit
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
