import React, { useEffect, useState, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import AuthLoader from '../components/AuthLoader';
import {
  insertRows,
  selectRows,
  upsertRows,
  updateRows,
  uploadPublicObject,
  deleteRows,
  invokeFunction,
  publicObjectUrl
} from '../lib/supabase';
import MapboxListingMap from '../components/MapboxListingMap';
import { sanitizeInput } from '../utils/format';
import imageCompression from 'browser-image-compression';
import {
  User,
  Phone,
  Building2,
  Home,
  DollarSign,
  Calendar,
  MapPin,
  Wifi,
  Car,
  Droplets,
  Zap,
  Shield,
  ImageIcon,
  Video,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Send,
  Info,
  FileText,
  BedDouble,
  Layers,
  Hash,
  Users,
  Banknote,
  Clock,
  AlertCircle
} from 'lucide-react';
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
import { Controller, useForm } from 'react-hook-form';
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
  description: z.string().min(5, 'Description must be at least 5 chars'),
  roomType: z.string(),
  propertyType: z.string().optional(),
  floor: z.string().optional(),
  totalRooms: z.preprocess((val) => (val === '' || val === null || val === undefined ? undefined : val), z.coerce.number().min(1).max(200).optional()),
  furnished: z.preprocess((val) => val === 'true' || val === true, z.boolean()),
  genderPreference: z.string(),
  availableFrom: z.string().optional(),

  // Step 2: Pricing
  priceMonthly: z.coerce.number().min(50000, 'Min 50,000 TZS'),
  securityDeposit: z.preprocess((val) => (val === '' || val === null || val === undefined ? 0 : val), z.coerce.number().min(0).optional()),
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
  houseRules: z.string().optional(),

  // Step 5: Photos & Video
  videoTourUrl: z.string().url().optional().or(z.literal('')),

  // Step 6: Review & Submit
  policyAccepted: z.boolean().refine(v => v === true, 'Policy must be accepted')
});


type FormValues = z.infer<typeof formSchema>;

const PHOTO_SLOTS = [
  { key: 'outside', label: 'Outside', required: true },
  { key: 'bedroom', label: 'Bedroom', required: true },
  { key: 'kitchen', label: 'Kitchen', required: true },
  { key: 'bathroom', label: 'Bathroom', required: true },
  { key: 'other1', label: 'Other', required: false },
  { key: 'other2', label: 'Other', required: false },
  { key: 'other3', label: 'Other', required: false },
  { key: 'other4', label: 'Other', required: false },
  { key: 'other5', label: 'Other', required: false },
  { key: 'other6', label: 'Other', required: false },
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
  priceMonthly: 0,
  securityDeposit: 0,
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
  { key: 'identity', label: 'Identity', description: 'Your contact details', icon: User },
  { key: 'basics', label: 'Basics', description: 'Room type and details', icon: Home },
  { key: 'pricing', label: 'Pricing', description: 'Rent and lease terms', icon: DollarSign },
  { key: 'location', label: 'Location', description: 'Address on map', icon: MapPin },
  { key: 'amenities', label: 'Amenities', description: 'Features and rules', icon: Zap },
  { key: 'photos', label: 'Photos', description: 'Images and video', icon: ImageIcon },
  { key: 'review', label: 'Review', description: 'Final check', icon: CheckCircle }
];

function formatPrice(value: number | string) {
  return `${new Intl.NumberFormat('en-TZ').format(Number(value || 0))} TZS`;
}

function humanize(value: string) {
  if (!value) return '';
  return value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

const DRAFT_STEP_FIELD = '__currentStep';
const LEGACY_DRAFT_STEP_LIMIT = 5;

function validateStep(step: number, values: any, files: any, previews: any): string {
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
      if (!values.lat || !values.lng) return 'Exact location on the map is required. Please tap "Get My Location" so Mapbox can accurately display your room.';
      return '';
    },
    4: () => {
      if (!values.houseRules || values.houseRules.length < 5) return 'House rules are required';
      const selectedAmenities = Object.values(values.amenities || {}).filter(Boolean);
      if (selectedAmenities.length === 0) return 'Select at least one amenity';
      return '';
    },
    5: () => {
      // If editing, existing photos will be kept if new ones aren't provided.
      const isEditingOffset = new URLSearchParams(window.location.search).has('edit');
      
      const uploadedCount = Object.values(files || {}).filter(f => f).length;
      const existingCount = Object.values(previews || {}).filter(p => p && p.startsWith('http')).length;
      const totalPhotos = uploadedCount + existingCount;

      if (totalPhotos < 4 && !isEditingOffset) {
        return 'Please upload at least 4 photos (Outside, Bedroom, Kitchen, Bathroom) to publish this listing.';
      }
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
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, token, refreshMe } = useAuth();

  const { register, control, handleSubmit, watch, setValue, formState: { errors }, reset } = useForm({
    resolver: zodResolver(formSchema) as any,
    defaultValues: DEFAULT_FORM,
    mode: 'onTouched'
  });

  const formValues = watch();
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [previews, setPreviews] = useState<Record<string, string | null>>({});
  const [photosToDelete, setPhotosToDelete] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [editId] = useState<string | null>(() => new URLSearchParams(location.search).get('edit'));
  const [loadingDraft, setLoadingDraft] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [screeningResult, setScreeningResult] = useState<any>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [, setSubmittedListingId] = useState<string | null>(null);
  const [draftsDisabled, setDraftsDisabled] = useState(false);
  const [originalListerId, setOriginalListerId] = useState<string | null>(null);
  const [originalStatus, setOriginalStatus] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState(
    String(user?.landlordVerificationStatus || '').trim().toLowerCase()
  );

  const isAdmin = user?.role === 'admin';
  const hasListerRole = user?.role === 'landlord' || user?.role === 'dalali' || user?.role === 'property_manager' || isAdmin;
  const isVerified = verificationStatus === 'approved' || verificationStatus === 'verified';
  const isRejected = verificationStatus === 'rejected';
  const verificationRequiredMessage = isRejected
    ? t('hostFlow.verificationRejected')
    : t('hostFlow.verificationPending');
  const submitButtonLabel = submitting
    ? t('hostFlow.btnSubmitting')
    : editId ? 'Update Listing' : t('hostFlow.btnSubmitListing');
  const canSubmitListing = Boolean(formValues.policyAccepted) && !submitting;

  useEffect(() => {
    setVerificationStatus(String(user?.landlordVerificationStatus || '').trim().toLowerCase());
  }, [user?.landlordVerificationStatus]);

  // Memoize map listings to prevent flickering when typing in other fields
  const mapPreviewListings = useMemo(() => {
    if (!formValues.lat || !formValues.lng) return [];
    return [{
      id: 'preview',
      latitude: Number(formValues.lat),
      longitude: Number(formValues.lng),
      title: formValues.title || 'Property Location',
      price_tzs: Number(formValues.priceMonthly || 0),
      availability_status: 'available' as const
    }];
  }, [formValues.lat, formValues.lng, formValues.title, formValues.priceMonthly]);

  useEffect(() => {
    let cancelled = false;

    async function syncVerificationStatus() {
      if (!user?.userId || !token || !hasListerRole) {
        return;
      }

      try {
        const rows = await selectRows('profiles', {
          select: 'verification_status',
          filters: [{ column: 'id', op: 'eq', value: user.userId }],
          limit: 1,
          accessToken: token
        });

        if (!cancelled && rows[0]) {
          const newStatus = String(rows[0].verification_status || '').trim().toLowerCase();
          const currentStatus = String(user?.landlordVerificationStatus || '').trim().toLowerCase();
          setVerificationStatus(newStatus);
          // If the status just became verified/approved, refresh the auth session
          // so canSubmitListing updates without needing a logout.
          if ((newStatus === 'verified' || newStatus === 'approved') &&
              currentStatus !== 'verified' && currentStatus !== 'approved') {
            try { await refreshMe(); } catch { /* ignore */ }
          }
        }
      } catch {
        // Keep the current in-memory status if background refresh fails.
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void syncVerificationStatus();
      }
    };

    void syncVerificationStatus();
    window.addEventListener('focus', syncVerificationStatus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', syncVerificationStatus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.userId, token, hasListerRole, step]);

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
          const filters: any[] = [{ column: 'id', op: 'eq', value: editId }];
          if (!isAdmin) {
            filters.push({ column: 'lister_id', op: 'eq', value: user.userId });
          }
          
          const records = await selectRows('listings', {
            select: '*',
            filters,
            limit: 1,
            accessToken: token
          });

          if (records?.length > 0 && mounted) {
            const row = records[0];
            setOriginalListerId(row.lister_id);
            setOriginalStatus(row.status);
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
              priceMonthly: row.price_monthly || 0,
              securityDeposit: row.security_deposit || 0,
              minLeaseMonths: row.min_lease_months || 1,
              paymentSchedule: row.payment_schedule || 'monthly',
              lateFeePolicy: row.late_fee_policy || '',
              utilitiesIncluded: false,
              region: row.region || 'Dar es Salaam',
              district: row.district || '',
              ward: row.ward || '',
              street: row.street || '',
              lat: row.lat ? String(row.lat) : '',
              lng: row.lng ? String(row.lng) : '',
              university: (row.near_universities?.[0]) || 'UDSM',
              accessibilityNotes: row.accessibility_notes || '',
              amenities: (() => {
                const raw = typeof row.amenities === 'string' ? (() => { try { return JSON.parse(row.amenities); } catch { return {}; } })() : (row.amenities || {});
                // Coerce all values to boolean to satisfy Zod
                const coerced = { ...DEFAULT_AMENITIES };
                Object.keys(raw).forEach(k => {
                  coerced[k] = raw[k] === true || raw[k] === 'true';
                });
                return coerced;
              })(),
              houseRules: row.house_rules || '',
              videoTourUrl: row.video_tour_url || '',
              availableFrom: row.available_from ? new Date(row.available_from).toISOString().split('T')[0] : '',
              ownerName: row.owner_name || '',
              ownerPhone: row.owner_phone || '',
              whatsappNumber: row.whatsapp_number || ''
            });
            setSuccess('Listing loaded for editing. Please update and re-submit.');
            
            // Fetch existing photos for previews
            try {
              const existingPhotos = await selectRows('listing_photos', {
                filters: [{ column: 'listing_id', op: 'eq', value: editId }],
                accessToken: token
              });
              const existingPreviews: Record<string, string> = {};
              const usedSlots = new Set<string>();

              // 1. Map standard slots first
              existingPhotos.forEach((p: any) => {
                if (PHOTO_SLOTS.some(s => s.key === p.angle)) {
                  existingPreviews[p.angle] = p.public_url || p.url;
                  usedSlots.add(p.angle);
                }
              });

              // 2. Map everything else to the first available "other" slot
              const otherSlots = PHOTO_SLOTS.filter(s => s.key.startsWith('other')).map(s => s.key);
              let otherIdx = 0;
              existingPhotos.forEach((p: any) => {
                if (!usedSlots.has(p.angle)) {
                  // Find next free other slot
                  while (otherIdx < otherSlots.length && usedSlots.has(otherSlots[otherIdx])) {
                    otherIdx++;
                  }
                  if (otherIdx < otherSlots.length) {
                    const targetSlot = otherSlots[otherIdx];
                    existingPreviews[targetSlot] = p.public_url || p.url;
                    usedSlots.add(targetSlot);
                    
                    // CRITICAL: We must remember that this slot actually represents a different angle in the DB
                    // So if we delete it, we must delete that specific angle.
                    // For now, we'll just allow the user to see and remove it.
                  }
                }
              });

              setPreviews(existingPreviews);
            } catch (photoFetchErr) {
              console.warn('Could not fetch existing photos for preview:', photoFetchErr);
            }

            setLoadingDraft(false);
            return;
          }
        }

        const draftRows = await selectRows('listing_drafts', {
          select: 'current_step,data',
          filters: [{ column: 'lister_id', op: 'eq', value: user.userId }],
          limit: 1,
          accessToken: token
        });

        if (!mounted) return;

        const draftRow = draftRows[0];
        const draftData =
          draftRow?.data && typeof draftRow.data === 'object' ? draftRow.data : null;

        if (draftData) {
          const restoredStep = Number(
            (draftData as any)[DRAFT_STEP_FIELD] || draftRow?.current_step || 1
          );
          const draftFormValues = { ...(draftData as Record<string, unknown>) };
          delete (draftFormValues as Record<string, unknown>)[DRAFT_STEP_FIELD];

          reset({
            ...DEFAULT_FORM,
            ...draftFormValues,
            fullName: (draftFormValues as any).fullName || user?.fullName || '',
            phone: user?.phone || (draftFormValues as any).phone || ''
          });
          setStep(Math.max(0, Math.min(restoredStep - 1, STEPS.length - 1)));
          setSuccess('Draft restored from cloud.');
        } else {
          reset({
            ...DEFAULT_FORM,
            fullName: user?.fullName || '',
            phone: user?.phone || ''
          });
        }
      } catch (err: any) {
        console.warn('Draft restore failed:', err?.message || err);
        if (mounted) {
          reset({
            ...DEFAULT_FORM,
            fullName: user?.fullName || '',
            phone: user?.phone || ''
          });
        }
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
      if (!user?.userId || !token || !hasListerRole || loadingDraft || draftsDisabled) return;
 
      setSavingDraft(true);
      try {
        const draftStep = step + 1;
        await upsertRows(
          'listing_drafts',
          {
            lister_id: user.userId,
            current_step: Math.min(draftStep, LEGACY_DRAFT_STEP_LIMIT),
            data: {
              ...formValues,
              [DRAFT_STEP_FIELD]: draftStep
            }
          },
          { accessToken: token, onConflict: 'lister_id' }
        );
      } catch (err: any) {
        console.warn('Draft autosave failed. Disabling drafts for this session to prevent console spam.', err.message);
        setDraftsDisabled(true);
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

  const progressPct = Math.round(((step + 1) / STEPS.length) * 100);

  const goNext = () => {
    const issue = validateStep(step, formValues, files, previews);
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
      const issue = validateStep(i, values, files, previews);
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

    console.group('🚀 Listing Submission Started');
    setSubmitting(true);
    setError('');

    try {
      const accessToken = token;
      const values = formValues;
      const profileRows = await selectRows('profiles', {
        select: 'verification_status',
        filters: [{ column: 'id', op: 'eq', value: user.userId }],
        limit: 1,
        accessToken
      });
      const latestVerificationStatus = String(
        profileRows[0]?.verification_status || verificationStatus
      )
        .trim()
        .toLowerCase();

      setVerificationStatus(latestVerificationStatus);

      if (latestVerificationStatus !== 'approved' && latestVerificationStatus !== 'verified') {
        setError(
          latestVerificationStatus === 'rejected'
            ? t('hostFlow.verificationRejected')
            : t('hostFlow.verificationPending')
        );
        return;
      }

      console.log('📦 Step 1: Updating Profile...');
      await upsertRows(
        'profiles',
        {
          id: user.userId,
          role: user.role,
          lister_type: values.listerType,
          full_name: values.fullName.trim()
        },
        { accessToken, onConflict: 'id' }
      );

      // Create listing
      // Use lat/lng strings from form if available
      const latNum = values.lat ? Number(values.lat) : null;
      const lngNum = values.lng ? Number(values.lng) : null;
      
      // We try the full payload first. If it fails due to missing columns (common in local setups),
      // we fall back to a minimal payload that we know exists in all versions.
      const formattedAmenities = Object.entries(values.amenities || {})
        .filter(([_, enabled]) => enabled === true)
        .map(([key]) => key);

      const targetListerId = editId && originalListerId ? originalListerId : user.userId;
      // If admin is editing, we probably shouldn't reset the status to pending.
      // If landlord is editing, it resets to pending unless they are just updating minor details?
      // For now, if admin, keep original status, else pending.
      const targetStatus = (isAdmin && editId && originalStatus) ? originalStatus : 'pending';

      const fullListingPayload = {
        lister_id: targetListerId,
        title: sanitizeInput(values.title),
        description: sanitizeInput(values.description),
        room_type: values.roomType,
        price_monthly: Number(values.priceMonthly),
        security_deposit: Number(values.securityDeposit || 0),
        floor: values.floor || null,
        total_rooms: values.totalRooms ? Number(values.totalRooms) : null,
        furnished: values.furnished,
        property_type: values.propertyType,
        owner_name: values.ownerName?.trim() || null,
        owner_phone: values.ownerPhone?.trim() || null,
        whatsapp_number: values.whatsappNumber?.trim() || null,
        min_lease_months: Number(values.minLeaseMonths || 1),
        payment_schedule: values.paymentSchedule,
        late_fee_policy: values.lateFeePolicy?.trim() || null,
        video_tour_url: values.videoTourUrl?.trim() || null,
        accessibility_notes: values.accessibilityNotes?.trim() || null,
        region: values.region,
        district: values.district,
        ward: values.ward,
        street: sanitizeInput(values.street),
        lat: latNum,
        lng: lngNum,
        amenities: formattedAmenities,
        available_from: values.availableFrom,
        vacancy_status: 'available',
        status: targetStatus,
        featured: false,
        near_universities: values.university ? [values.university] : [],
        screening_passed: false
      };

      const minimalListingPayload = {
        lister_id: targetListerId,
        title: values.title.trim(),
        description: values.description.trim(),
        room_type: values.roomType,
        price_monthly: Number(values.priceMonthly),
        region: values.region,
        district: values.district,
        ward: values.ward,
        street: values.street.trim(),
        lat: latNum,
        lng: lngNum,
        amenities: formattedAmenities,
        vacancy_status: 'available',
        status: targetStatus,
        featured: false
      };

      console.log('📦 Step 2: Creating Listing...');
      let createdListingId: string;

      if (editId) {
        try {
          const updateFilters: any[] = [{ column: 'id', op: 'eq', value: editId }];
          if (!isAdmin) {
            updateFilters.push({ column: 'lister_id', op: 'eq', value: user.userId });
          }
          await updateRows('listings', fullListingPayload, {
            filters: updateFilters,
            accessToken
          });
          createdListingId = editId;
          console.log('✅ Listing updated (Full Mode)');
        } catch (updateErr: any) {
          console.warn('⚠️ Full listing update failed, trying Safe Mode...', updateErr.message);
          const updateFilters: any[] = [{ column: 'id', op: 'eq', value: editId }];
          if (!isAdmin) {
            updateFilters.push({ column: 'lister_id', op: 'eq', value: user.userId });
          }
          await updateRows('listings', minimalListingPayload, {
            filters: updateFilters,
            accessToken
          });
          createdListingId = editId;
          console.log('✅ Listing updated (Safe Mode)');
        }
      } else {
        try {
          const inserted = await insertRows('listings', fullListingPayload, { accessToken });
          createdListingId = inserted[0].id;
          console.log('✅ Listing created (Full Mode)');
        } catch (insertErr: any) {
          console.warn('⚠️ Full listing insert failed, trying Safe Mode...', insertErr.message);
          const inserted = await insertRows('listings', minimalListingPayload, { accessToken });
          createdListingId = inserted[0].id;
          console.log('✅ Listing created (Safe Mode)');
        }
      }
      
      if (!createdListingId) {
        throw new Error('Listing was not created successfully (no ID returned). Please check your internet connection or contact support.');
      }

      // Notify the original lister if an admin edited their listing
      if (editId && isAdmin && originalListerId && originalListerId !== user.userId) {
        try {
          await insertRows('notifications', {
            user_id: originalListerId,
            type: 'system',
            title: 'Listing Updated by Admin',
            body: `Your listing "${values.title}" was reviewed and updated by an administrator.`,
          }, { accessToken });
          console.log('✅ Sent notification to landlord about admin edit');
        } catch (notifErr) {
          console.warn('⚠️ Failed to send admin edit notification', notifErr);
        }
      }

      // STEP 3: Handle Photos (Clean Slate Approach)
      console.log('📦 Step 3: Processing Photos...');
      
      if (editId) {
        console.log('🗑️ Clearing old photo records for clean sync...');
        await deleteRows('listing_photos', {
          filters: [{ column: 'listing_id', op: 'eq', value: editId }],
          accessToken
        }).catch(err => console.warn('Photo cleanup warning:', err));
      }

      const photoRows: any[] = [];
      const slots = PHOTO_SLOTS;

      for (let index = 0; index < slots.length; index++) {
        const slot = slots[index];
        const file = files[slot.key];
        const existingPreview = previews[slot.key];

        if (file) {
          // 1. Upload NEW photo
          console.log(`📸 Uploading NEW ${slot.label}...`);
          const compressedFile = await imageCompression(file, {
            maxSizeMB: 0.8,
            maxWidthOrHeight: 1600,
            useWebWorker: true
          });

          const ext = file.name.split('.').pop();
          const storagePath = `${createdListingId}/${slot.key}_${Date.now()}.${ext}`;

          await uploadPublicObject({
            bucket: 'listing-photos',
            path: storagePath,
            file: compressedFile,
            accessToken
          });

          const publicUrl = publicObjectUrl('listing-photos', storagePath);
          
          photoRows.push({
            listing_id: createdListingId,
            angle: slot.key,
            storage_path: storagePath,
            public_url: publicUrl,
            position: index,
            caption: slot.label,
            is_cover: index === 0
          });
        } else if (existingPreview && !photosToDelete.includes(slot.key)) {
          // 2. Keep EXISTING photo
          console.log(`♻️ Keeping EXISTING ${slot.label}...`);
          photoRows.push({
            listing_id: createdListingId,
            angle: slot.key,
            storage_path: 'existing', // We don't have the path easily, but the view/logic usually uses URL
            public_url: existingPreview,
            position: index,
            caption: slot.label,
            is_cover: index === 0
          });
        }
      }

      if (photoRows.length > 0) {
        console.log(`📦 Step 4: Saving ${photoRows.length} Photo Records...`);
        try {
          await insertRows('listing_photos', photoRows, { accessToken });
          console.log('✅ Photos saved successfully');
        } catch (photoErr: any) {
          console.warn('⚠️ Full photo records failed, trying Safe Mode...', photoErr.message);
          // Safe mode: remove columns not in initial seed
          const safePhotoRows = photoRows.map(p => {
            const { position: _position, caption: _caption, is_cover: _is_cover, ...rest } = p;
            return rest;
          });
          await insertRows('listing_photos', safePhotoRows, { accessToken });
          console.log('✅ Photos saved (Safe Mode)');
        }
      }

      console.log('📦 Step 5: Cleaning up Draft...');
      if (!editId) {
        await deleteRows('listing_drafts', {
          filters: [{ column: 'lister_id', op: 'eq', value: user.userId }],
          accessToken
        });
      }

      console.log('📦 Step 6: Triggering Screening...');
      try {
        const screeningResponse = await invokeFunction('screen-listing', { listingId: createdListingId }, accessToken);
        setScreeningResult(screeningResponse);
        setSuccess(editId ? '🎉 Your listing has been updated!' : '🎉 Your listing is now live!');
        setIsSubmitted(true);
        setSubmittedListingId(createdListingId);
        console.log('✅ Screening triggered successfully');
      } catch (screenErr) {
        console.warn('⚠️ Screening delayed:', screenErr);
        setSuccess(editId ? '🎉 Your listing has been updated!' : 'Listing saved. Screening is running in the background.');
        setIsSubmitted(true);
        setSubmittedListingId(createdListingId);
      }
      
      console.groupEnd();
    } catch (err: any) {
      console.groupEnd();
      console.error('❌ Submission Failed:', err);
      setError(err.message || 'An unexpected error occurred during submission.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (step < STEPS.length - 1) {
      event.preventDefault();
      goNext();
      return;
    }

    const onInvalid = (errors: any) => {
      console.error('📋 Form Validation Failed:', errors);
      setError('Please fix the errors in the form before submitting.');
    };

    return handleSubmit(submitListing, onInvalid)(event);
  };

  if (!hasListerRole) {
    return (
      <div className="container section">
        <section className="card">
          <h1>Lister Account Required</h1>
          <p>You need a lister account to post properties.</p>
          <Link to="/auth/signup?role=landlord" className="btn">Register as Lister</Link>
        </section>
      </div>
    );
  }

  if (loadingDraft) {
    return (
      <AuthLoader 
        title="Preparing your listing..." 
        subtitle={editId ? 'Loading your property details' : 'Getting everything ready for you'}
      />
    );
  }

  if (isSubmitted) {
    return (
      <div className="container section">
        <div className="card" style={{ 
          padding: '3rem 2rem', 
          textAlign: 'center', 
          maxWidth: '600px', 
          margin: '2rem auto',
          border: '1px solid #B8DFC8',
          background: '#EDF7F1'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🎉</div>
          <h1 style={{ color: '#1D9E75', marginBottom: '1rem' }}>Success!</h1>
          <p style={{ fontSize: '1.1rem', color: '#1A1A2E', marginBottom: '2rem' }}>
            {success}
          </p>
          
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link to={`/${user?.role === 'landlord' ? 'landlord' : user?.role === 'property_manager' ? 'manager' : 'tenant'}/dashboard`} className="btn btn--primary">
              Go to Dashboard
            </Link>
            <button onClick={() => window.location.reload()} className="btn btn--outline">Post Another</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container section" style={{ padding: '1rem' }}>
      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .step-content { animation: slideIn 0.3s ease-out; }
        .form-step-icon { animation: fadeIn 0.4s ease-out; }
      `}</style>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
          <div style={{ 
            width: 56, 
            height: 56, 
            borderRadius: 16, 
            background: 'linear-gradient(135deg, #16a34a, #166534)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 0.75rem',
            color: 'white'
          }}>
            <Building2 size={28} />
          </div>
          <h1 style={{ 
            fontSize: 'clamp(1.1rem, 4vw, 1.5rem)', 
            fontWeight: 700, 
            color: '#1A1A2E',
            marginBottom: '0.25rem',
            whiteSpace: 'nowrap'
          }}>
            {editId ? 'Edit Listing' : 'List Property'}
          </h1>
          <p style={{ 
            color: '#6B6B5A', 
            fontSize: 'clamp(0.75rem, 3vw, 0.9rem)',
            whiteSpace: 'nowrap'
          }}>
            Step {step + 1} of {STEPS.length}: {STEPS[step].label}
          </p>
        </div>

        {/* Progress Steps */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            marginBottom: '0.75rem'
          }}>
            {STEPS.map((s, idx) => {
              const Icon = s.icon;
              const isActive = idx === step;
              const isCompleted = idx < step;
              return (
                <div key={s.key} style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  flex: 1,
                  opacity: isActive || isCompleted ? 1 : 0.4
                }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: isCompleted ? '#16a34a' : isActive ? 'linear-gradient(135deg, #16a34a, #166534)' : '#e5e5e0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isActive || isCompleted ? 'white' : '#6B6B5A',
                    marginBottom: 4,
                    transition: 'all 0.3s ease'
                  }} className="form-step-icon">
                    {isCompleted ? <CheckCircle size={16} /> : <Icon size={16} />}
                  </div>
                  <span style={{
                    fontSize: 'clamp(0.6rem, 2vw, 0.7rem)',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#166534' : '#6B6B5A',
                    whiteSpace: 'nowrap'
                  }}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{ 
            height: 6, 
            background: '#E5E5E0', 
            borderRadius: 3, 
            overflow: 'hidden' 
          }}>
            <div style={{ 
              width: `${progressPct}%`, 
              height: '100%', 
              background: 'linear-gradient(90deg, #16a34a, #22c55e)', 
              transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              borderRadius: 3
            }} />
          </div>
        </div>

        {error && (
          <div style={{ 
            padding: '1rem', 
            background: '#FDF2F2', 
            color: '#C0392B', 
            borderRadius: '8px', 
            marginBottom: '1.5rem',
            border: '1px solid #F8D7DA',
            fontSize: '0.9rem'
          }}>
            ⚠️ {error}
          </div>
        )}

        {success && !isSubmitted && (
          <div style={{ 
            padding: '1rem', 
            background: '#EDF7F1', 
            color: '#1D9E75', 
            borderRadius: '8px', 
            marginBottom: '1.5rem',
            border: '1px solid #B8DFC8',
            fontSize: '0.9rem'
          }}>
            ✓ {success}
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="card" style={{ 
          padding: 'clamp(1rem, 4vw, 2rem)', 
          borderRadius: 16,
          border: '1px solid var(--border)',
          background: 'white',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
        }}>
          {/* Step 0: Identity */}
          {step === 0 && (
            <div className="step-content" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EAF3DE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#166534' }}>
                  <User size={16} />
                </div>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1A1A2E', whiteSpace: 'nowrap' }}>Contact Information</span>
              </div>

              <label>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem', color: '#1A1A2E', whiteSpace: 'nowrap' }}>Full Name</div>
                <input {...register('fullName')} placeholder="Your legal name" style={{ width: '100%', padding: '0.65rem', border: '1px solid #E5E5E0', borderRadius: 10, fontSize: '0.9rem', outline: 'none', transition: 'all 0.2s' }} />
                {errors.fullName && <span style={{ color: '#C0392B', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{errors.fullName.message}</span>}
              </label>

              <label>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem', color: '#1A1A2E', whiteSpace: 'nowrap' }}>Phone Number</div>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6B6B5A' }} />
                  <input {...register('phone')} placeholder="+255..." style={{ width: '100%', padding: '0.65rem 0.65rem 0.65rem 2.5rem', border: '1px solid #E5E5E0', borderRadius: 10, fontSize: '0.9rem', outline: 'none', transition: 'all 0.2s' }} />
                </div>
                {errors.phone && <span style={{ color: '#C0392B', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{errors.phone.message}</span>}
              </label>

              <label>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem', color: '#1A1A2E', whiteSpace: 'nowrap' }}>Lister Type</div>
                <select {...register('listerType')} style={{ width: '100%', padding: '0.65rem', border: '1px solid #E5E5E0', borderRadius: 10, fontSize: '0.9rem', outline: 'none', background: 'white', cursor: 'pointer' }}>
                  <option value="owner">Owner</option>
                  <option value="manager">Property Manager</option>
                  <option value="dalali">Dalali / Agent</option>
                </select>
              </label>

              {formValues.listerType === 'dalali' && (
                <>
                  <label>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem', color: '#1A1A2E', whiteSpace: 'nowrap' }}>Owner's Name</div>
                    <input {...register('ownerName')} placeholder="The actual owner's name" style={{ width: '100%', padding: '0.65rem', border: '1px solid #E5E5E0', borderRadius: 10, fontSize: '0.9rem' }} />
                  </label>
                  <label>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem', color: '#1A1A2E', whiteSpace: 'nowrap' }}>Owner's Phone</div>
                    <input {...register('ownerPhone')} placeholder="+255..." style={{ width: '100%', padding: '0.65rem', border: '1px solid #E5E5E0', borderRadius: 10, fontSize: '0.9rem' }} />
                  </label>
                </>
              )}

              <label style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem', color: '#1A1A2E', whiteSpace: 'nowrap' }}>WhatsApp (Optional)</div>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6B6B5A' }} />
                  <input {...register('whatsappNumber')} placeholder="+255..." style={{ width: '100%', padding: '0.65rem 0.65rem 0.65rem 2.5rem', border: '1px solid #E5E5E0', borderRadius: 10, fontSize: '0.9rem' }} />
                </div>
              </label>
            </div>
          )}

          {/* Step 1: Basics */}
          {step === 1 && (
            <div className="step-content" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EAF3DE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#166534' }}>
                  <Home size={16} />
                </div>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1A1A2E', whiteSpace: 'nowrap' }}>Room Details</span>
              </div>

              <label style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem', color: '#1A1A2E', whiteSpace: 'nowrap' }}>Listing Title</div>
                <div style={{ position: 'relative' }}>
                  <FileText size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6B6B5A' }} />
                  <input {...register('title')} placeholder="e.g., Master Bedroom near UDSM" style={{ width: '100%', padding: '0.65rem 0.65rem 0.65rem 2.5rem', border: '1px solid #E5E5E0', borderRadius: 10, fontSize: '0.9rem' }} />
                </div>
                {errors.title && <span style={{ color: '#C0392B', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{errors.title.message}</span>}
              </label>

              <label>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem', color: '#1A1A2E', whiteSpace: 'nowrap' }}>Room Type</div>
                <select {...register('roomType')} style={{ width: '100%', padding: '0.65rem', border: '1px solid #E5E5E0', borderRadius: 10, fontSize: '0.9rem' }}>
                  {ROOM_TYPES.map(op => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>
              </label>

              <label>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem', color: '#1A1A2E', whiteSpace: 'nowrap' }}>Property Type</div>
                <select {...register('propertyType')} style={{ width: '100%', padding: '0.65rem', border: '1px solid #E5E5E0', borderRadius: 10, fontSize: '0.9rem' }}>
                  <option value="">Select type</option>
                  {PROPERTY_TYPES.map(op => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>
              </label>

              <label>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem', color: '#1A1A2E', whiteSpace: 'nowrap' }}>Floor</div>
                <select {...register('floor')} style={{ width: '100%', padding: '0.65rem', border: '1px solid #E5E5E0', borderRadius: 10, fontSize: '0.9rem' }}>
                  <option value="">Select floor</option>
                  {FLOOR_OPTIONS.map(op => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>
              </label>

              <label>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem', color: '#1A1A2E', whiteSpace: 'nowrap' }}>Total Rooms</div>
                <div style={{ position: 'relative' }}>
                  <Hash size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6B6B5A' }} />
                  <input type="number" {...register('totalRooms')} placeholder="e.g., 12" style={{ width: '100%', padding: '0.65rem 0.65rem 0.65rem 2.5rem', border: '1px solid #E5E5E0', borderRadius: 10, fontSize: '0.9rem' }} />
                </div>
              </label>

              <label>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem', color: '#1A1A2E', whiteSpace: 'nowrap' }}>Furnished?</div>
                <select {...register('furnished')} style={{ width: '100%', padding: '0.65rem', border: '1px solid #E5E5E0', borderRadius: 10, fontSize: '0.9rem' }}>
                  <option value="false">Unfurnished</option>
                  <option value="true">Furnished</option>
                </select>
              </label>

              <label>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem', color: '#1A1A2E', whiteSpace: 'nowrap' }}>Gender</div>
                <select {...register('genderPreference')} style={{ width: '100%', padding: '0.65rem', border: '1px solid #E5E5E0', borderRadius: 10, fontSize: '0.9rem' }}>
                  {GENDER_PREFERENCES.map(op => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>
              </label>

              <label>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem', color: '#1A1A2E', whiteSpace: 'nowrap' }}>Available From</div>
                <div style={{ position: 'relative' }}>
                  <Calendar size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6B6B5A' }} />
                  <input type="date" {...register('availableFrom')} style={{ width: '100%', padding: '0.65rem 0.65rem 0.65rem 2.5rem', border: '1px solid #E5E5E0', borderRadius: 10, fontSize: '0.9rem' }} />
                </div>
              </label>

              <label style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem', color: '#1A1A2E', whiteSpace: 'nowrap' }}>Description</div>
                <textarea {...register('description')} placeholder="Describe the room, location, and what makes it special..." style={{ width: '100%', padding: '0.65rem', border: '1px solid #E5E5E0', borderRadius: 10, fontSize: '0.9rem', minHeight: '100px', resize: 'vertical' }} />
                {errors.description && <span style={{ color: '#C0392B', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{errors.description.message}</span>}
              </label>
            </div>
          )}

          {/* Step 2: Pricing */}
          {step === 2 && (
            <div className="step-content" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EAF3DE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#166534' }}>
                  <DollarSign size={16} />
                </div>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1A1A2E', whiteSpace: 'nowrap' }}>Pricing Details</span>
              </div>

              <label>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem', color: '#1A1A2E', whiteSpace: 'nowrap' }}>Monthly Rent (TZS)</div>
                <div style={{ position: 'relative' }}>
                  <Banknote size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6B6B5A' }} />
                  <input type="number" {...register('priceMonthly')} min="50000" placeholder="250000" style={{ width: '100%', padding: '0.65rem 0.65rem 0.65rem 2.5rem', border: '1px solid #E5E5E0', borderRadius: 10, fontSize: '0.9rem' }} />
                </div>
                {errors.priceMonthly && <span style={{ color: '#C0392B', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{errors.priceMonthly.message}</span>}
              </label>

              <label>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem', color: '#1A1A2E', whiteSpace: 'nowrap' }}>Security Deposit</div>
                <input type="number" {...register('securityDeposit')} min="0" placeholder="250000" style={{ width: '100%', padding: '0.65rem', border: '1px solid #E5E5E0', borderRadius: 10, fontSize: '0.9rem' }} />
              </label>

              <label>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem', color: '#1A1A2E', whiteSpace: 'nowrap' }}>Min Lease</div>
                <select {...register('minLeaseMonths')} style={{ width: '100%', padding: '0.65rem', border: '1px solid #E5E5E0', borderRadius: 10, fontSize: '0.9rem' }}>
                  <option value="1">1 mo</option>
                  <option value="2">2 mo</option>
                  <option value="3">3 mo</option>
                  <option value="6">6 mo</option>
                  <option value="12">12 mo</option>
                </select>
              </label>

              <label>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem', color: '#1A1A2E', whiteSpace: 'nowrap' }}>Payment</div>
                <select {...register('paymentSchedule')} style={{ width: '100%', padding: '0.65rem', border: '1px solid #E5E5E0', borderRadius: 10, fontSize: '0.9rem' }}>
                  {PAYMENT_SCHEDULES.map(op => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>
              </label>

              <label style={{ gridColumn: '1 / -1', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', fontWeight: 600, color: '#1A1A2E' }}>
                  <input type="checkbox" {...register('utilitiesIncluded')} style={{ width: 18, height: 18, cursor: 'pointer' }} />
                  Utilities Included
                </div>
              </label>

              <label style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem', color: '#1A1A2E', whiteSpace: 'nowrap' }}>Late Fee Policy (Optional)</div>
                <textarea {...register('lateFeePolicy')} placeholder="e.g., TZS 5,000/day after 5-day grace" style={{ width: '100%', padding: '0.65rem', border: '1px solid #E5E5E0', borderRadius: 10, fontSize: '0.9rem', minHeight: '70px' }} />
              </label>
            </div>
          )}

          {/* Step 3: Location */}
          {step === 3 && (
            <div className="step-content" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EAF3DE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#166534' }}>
                  <MapPin size={16} />
                </div>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1A1A2E', whiteSpace: 'nowrap' }}>Property Location</span>
              </div>

              <label>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem', color: '#1A1A2E', whiteSpace: 'nowrap' }}>Region</div>
                <select {...register('region')} style={{ width: '100%', padding: '0.65rem', border: '1px solid #E5E5E0', borderRadius: 10, fontSize: '0.9rem' }}>
                  <option value="Dar es Salaam">Dar es Salaam</option>
                </select>
              </label>

              <label>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem', color: '#1A1A2E', whiteSpace: 'nowrap' }}>District</div>
                <select {...register('district')} onChange={(e) => { setValue('district', e.target.value); setValue('ward', ''); }} style={{ width: '100%', padding: '0.65rem', border: '1px solid #E5E5E0', borderRadius: 10, fontSize: '0.9rem' }}>
                  {DAR_DISTRICTS.map(op => (<option key={op.value} value={op.value}>{op.label}</option>))}
                </select>
              </label>

              <label>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem', color: '#1A1A2E', whiteSpace: 'nowrap' }}>Ward</div>
                <select {...register('ward')} style={{ width: '100%', padding: '0.65rem', border: '1px solid #E5E5E0', borderRadius: 10, fontSize: '0.9rem' }}>
                  <option value="">Select ward</option>
                  {(DAR_WARDS[formValues.district as keyof typeof DAR_WARDS] || []).map(w => (<option key={w} value={w}>{w}</option>))}
                </select>
              </label>

              <label>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem', color: '#1A1A2E', whiteSpace: 'nowrap' }}>Street / Building</div>
                <input {...register('street')} placeholder="Street name and building" style={{ width: '100%', padding: '0.65rem', border: '1px solid #E5E5E0', borderRadius: 10, fontSize: '0.9rem' }} />
              </label>

              <label>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem', color: '#1A1A2E', whiteSpace: 'nowrap' }}>Nearby University</div>
                <select {...register('university')} style={{ width: '100%', padding: '0.65rem', border: '1px solid #E5E5E0', borderRadius: 10, fontSize: '0.9rem' }}>
                  {UNIVERSITIES.map(op => (<option key={op.value} value={op.value}>{op.label}</option>))}
                </select>
              </label>

              <div style={{ gridColumn: '1 / -1' }}>
                <button type="button" onClick={handleGetLocation} disabled={gettingLocation} style={{ width: '100%', padding: '0.75rem', background: 'linear-gradient(135deg, #16a34a, #166534)', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <MapPin size={18} />
                  {gettingLocation ? 'Getting location...' : 'Get Current Location'}
                </button>
                {formValues.lat && formValues.lng && (
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <CheckCircle size={14} /> {formValues.lat}, {formValues.lng}
                  </p>
                )}
              </div>

              <details style={{ gridColumn: '1 / -1' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', color: '#6B6B5A', whiteSpace: 'nowrap' }}>Enter coordinates manually</summary>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <label>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem', color: '#1A1A2E', whiteSpace: 'nowrap' }}>Latitude</div>
                    <input {...register('lat')} placeholder="-6.7924" style={{ width: '100%', padding: '0.65rem', border: '1px solid #E5E5E0', borderRadius: 10, fontSize: '0.9rem' }} />
                  </label>
                  <label>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem', color: '#1A1A2E', whiteSpace: 'nowrap' }}>Longitude</div>
                    <input {...register('lng')} placeholder="39.2083" style={{ width: '100%', padding: '0.65rem', border: '1px solid #E5E5E0', borderRadius: 10, fontSize: '0.9rem' }} />
                  </label>
                </div>
              </details>

              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem', color: '#1A1A2E', whiteSpace: 'nowrap' }}>Map Preview</div>
                <div style={{ height: '250px', width: '100%', borderRadius: 12, overflow: 'hidden', border: '1px solid #E5E5E0', background: '#f5f5f0' }}>
                  <MapboxListingMap rooms={mapPreviewListings} onRoomClick={() => {}} />
                </div>
                {!formValues.lat && (
                  <p style={{ fontSize: '0.75rem', color: '#6B6B5A', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Info size={14} /> Tap "Get Current Location" to see map
                  </p>
                )}
              </div>

              <label style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem', color: '#1A1A2E', whiteSpace: 'nowrap' }}>Accessibility Notes (Optional)</div>
                <textarea {...register('accessibilityNotes')} placeholder="e.g., Ground floor, wheelchair access" style={{ width: '100%', padding: '0.65rem', border: '1px solid #E5E5E0', borderRadius: 10, fontSize: '0.9rem', minHeight: '70px' }} />
              </label>
            </div>
          )}

          {/* Step 4: Amenities */}
          {step === 4 && (
            <div className="step-content" style={{ display: 'grid', gap: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EAF3DE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#166534' }}>
                  <Zap size={16} />
                </div>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1A1A2E', whiteSpace: 'nowrap' }}>Amenities & Rules</span>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', color: '#1A1A2E', whiteSpace: 'nowrap' }}>Select Available Amenities</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {AMENITIES_LIST.map(amenity => (
                    <button key={amenity.key} type="button" onClick={() => updateAmenity(amenity.key)} style={{ padding: '0.6rem 1rem', border: formValues.amenities[amenity.key] ? `2px solid #16a34a` : `1px solid #E5E5E0`, background: formValues.amenities[amenity.key] ? '#EAF3DE' : 'white', borderRadius: 10, cursor: 'pointer', fontWeight: formValues.amenities[amenity.key] ? 600 : 400, color: formValues.amenities[amenity.key] ? '#166534' : '#6B6B5A', transition: 'all 0.2s', fontSize: '0.8rem', whiteSpace: 'nowrap', width: 'fit-content' }}>
                      {amenity.emoji} {amenity.label}
                    </button>
                  ))}
                </div>
              </div>

              <label>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem', color: '#1A1A2E', whiteSpace: 'nowrap' }}>House Rules</div>
                <textarea {...register('houseRules')} placeholder="No smoking&#10;Quiet after 10 PM&#10;No visitors after 8 PM" style={{ width: '100%', padding: '0.65rem', border: '1px solid #E5E5E0', borderRadius: 10, minHeight: '100px', fontSize: '0.9rem' }} />
                {errors.houseRules && <span style={{ color: '#C0392B', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{errors.houseRules.message}</span>}
              </label>
            </div>
          )}

          {/* Step 5: Photos */}
          {step === 5 && (
            <div className="step-content" style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EAF3DE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#166534' }}>
                  <ImageIcon size={16} />
                </div>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1A1A2E', whiteSpace: 'nowrap' }}>Photos & Video</span>
              </div>

              <p style={{ color: '#6B6B5A', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>Upload 4-10 photos. First 4 required.</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
                {PHOTO_SLOTS.map((slot) => (
                  <div key={slot.key} style={{
                    border: (files[slot.key] || previews[slot.key]) ? '2px solid #16a34a' : '2px dashed #E5E5E0',
                    borderRadius: 12,
                    padding: '0.75rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative',
                    background: (files[slot.key] || previews[slot.key]) ? '#EAF3DE' : 'white'
                  }}>
                    {(files[slot.key] || previews[slot.key]) && (
                      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFiles(prev => ({ ...prev, [slot.key]: null })); setPreviews(prev => ({ ...prev, [slot.key]: null })); if (editId) setPhotosToDelete(prev => [...prev, slot.key]); }} style={{ position: 'absolute', top: '4px', right: '4px', background: '#DC2626', color: 'white', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>✕</button>
                    )}
                    <label style={{ cursor: 'pointer', display: 'block' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.3rem', color: '#1A1A2E', whiteSpace: 'nowrap' }}>
                        {slot.label} {slot.required && <span style={{ color: '#DC2626' }}>*</span>}
                      </div>
                      {previews[slot.key] ? (
                        <div style={{ marginBottom: '0.5rem' }}>
                          <img src={previews[slot.key]!} alt={slot.label} style={{ width: 60, height: 45, objectFit: 'cover', borderRadius: 6, border: '1px solid #E5E5E0' }} />
                        </div>
                      ) : (
                        <div style={{ width: 60, height: 45, margin: '0 auto 0.5rem', borderRadius: 6, background: '#f5f5f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B6B5A' }}>
                          <ImageIcon size={20} />
                        </div>
                      )}
                      {files[slot.key] ? (
                        <div style={{ color: '#16a34a', fontSize: '0.7rem', whiteSpace: 'nowrap' }}><CheckCircle size={12} style={{ display: 'inline' }} /> Done</div>
                      ) : previews[slot.key] ? (
                        <div style={{ color: '#16a34a', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>Saved</div>
                      ) : (
                        <div style={{ color: '#6B6B5A', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>Click to upload</div>
                      )}
                      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { const file = e.target.files?.[0] || null; setFiles(prev => ({ ...prev, [slot.key]: file })); if (file) { setPreviews(prev => ({ ...prev, [slot.key]: URL.createObjectURL(file) })); setPhotosToDelete(prev => prev.filter(a => a !== slot.key)); } }} style={{ display: 'none' }} />
                    </label>
                  </div>
                ))}
              </div>

              <label style={{ marginTop: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem', color: '#1A1A2E', whiteSpace: 'nowrap' }}>Video Tour URL (Optional)</div>
                <div style={{ position: 'relative' }}>
                  <Video size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6B6B5A' }} />
                  <input {...register('videoTourUrl')} placeholder="https://youtube.com/watch?v=..." style={{ width: '100%', padding: '0.65rem 0.65rem 0.65rem 2.5rem', border: '1px solid #E5E5E0', borderRadius: 10, fontSize: '0.9rem' }} />
                </div>
              </label>
            </div>
          )}

          {/* Step 6: Review & Submit */}
          {step === 6 && (
            <div className="step-content" style={{ display: 'grid', gap: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EAF3DE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#166534' }}>
                  <CheckCircle size={16} />
                </div>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1A1A2E', whiteSpace: 'nowrap' }}>Review & Submit</span>
              </div>

              <div style={{ background: '#F7FAFC', padding: '1.25rem', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 600, color: '#1A1A2E', whiteSpace: 'nowrap' }}>Listing Summary</h3>
                <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={14} style={{ color: '#6B6B5A' }} />
                    <span style={{ whiteSpace: 'nowrap' }}><strong>Title:</strong> {formValues.title || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Banknote size={14} style={{ color: '#6B6B5A' }} />
                    <span style={{ whiteSpace: 'nowrap' }}><strong>Rent:</strong> {formatPrice(formValues.priceMonthly)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapPin size={14} style={{ color: '#6B6B5A' }} />
                    <span style={{ whiteSpace: 'nowrap' }}><strong>Location:</strong> {formValues.street || '-'}, {formValues.ward || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Home size={14} style={{ color: '#6B6B5A' }} />
                    <span style={{ whiteSpace: 'nowrap' }}><strong>Type:</strong> {humanize(formValues.roomType)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ImageIcon size={14} style={{ color: '#6B6B5A' }} />
                    <span style={{ whiteSpace: 'nowrap' }}><strong>Photos:</strong> {Object.values(files).filter(Boolean).length} uploaded</span>
                  </div>
                </div>
              </div>

              <label style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8rem', color: '#1A1A2E' }}>
                  <input type="checkbox" {...register('policyAccepted')} defaultChecked={false} style={{ width: 18, height: 18, marginTop: '2px', cursor: 'pointer', flexShrink: 0 }} />
                  <span style={{ lineHeight: 1.4, wordBreak: 'break-word' }}>I confirm all info is accurate and I have authority to list this property.</span>
                </div>
                {errors.policyAccepted && <p style={{ color: '#C0392B', fontSize: '0.75rem', marginTop: '0.5rem' }}>{errors.policyAccepted.message}</p>}
              </label>
            </div>
          )}

          {/* Navigation Buttons */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            marginTop: '2rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid #E5E5E0',
            gap: '0.75rem'
          }}>
            {step > 0 ? (
              <button 
                type="button" 
                onClick={goBack} 
                disabled={submitting}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.6rem 1rem',
                  borderRadius: 10,
                  border: '1px solid #E5E5E0',
                  background: 'white',
                  color: '#1A1A2E',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                <ChevronLeft size={18} />
                Back
              </button>
            ) : <div />}

            <button 
              type="submit" 
              disabled={submitting || (step === 6 && !canSubmitListing)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.6rem 1.25rem',
                borderRadius: 10,
                border: 'none',
                background: submitting ? '#9ca3af' : 'linear-gradient(135deg, #16a34a, #166534)',
                color: 'white',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: submitting || (step === 6 && !canSubmitListing) ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
                opacity: submitting || (step === 6 && !canSubmitListing) ? 0.7 : 1,
                transition: 'all 0.2s'
              }}
            >
              {step === 6 ? (
                <><Send size={16} /> {submitButtonLabel}</>
              ) : (
                <>{'Next'} <ChevronRight size={18} /></>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
