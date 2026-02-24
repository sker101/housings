import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient, extractErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';

const STEPS = [
  {
    key: 'BASICS',
    label: 'Basics',
    shortLabel: '01',
    title: 'Lister Account & Basics',
    subtitle: 'Choose account type and complete identity + property basics'
  },
  {
    key: 'LOCATION',
    label: 'Location & Price',
    shortLabel: '02',
    title: 'Location & Price',
    subtitle: 'Provide exact address, map pin, and rent details'
  },
  {
    key: 'PHOTOS',
    label: 'Photos',
    shortLabel: '03',
    title: 'Photos',
    subtitle: 'Upload all 4 required photos. AI checks run when you submit.'
  },
  {
    key: 'REVIEW',
    label: 'Review',
    shortLabel: '04',
    title: 'Review & Policies',
    subtitle: 'Confirm platform policies before submitting for admin review'
  }
];

const ACCOUNT_TYPES = [
  {
    value: 'OWNER',
    label: 'Property Owner',
    description: 'Verified owner of the property (landlord).'
  },
  {
    value: 'MANAGER',
    label: 'Property Manager',
    description: 'Managing property officially on behalf of owner.'
  },
  {
    value: 'DALALI',
    label: 'Dalali (Agent/Broker)',
    description: 'Agent listing with written permission from landlord.'
  }
];

const PROPERTY_TYPES = [
  { value: 'SINGLE_ROOM', label: 'Single Room' },
  { value: 'SELF_CONTAINED', label: 'Self-Contained Room' },
  { value: 'APARTMENT', label: 'Apartment' },
  { value: 'FULL_HOUSE', label: 'Full House' },
  { value: 'HOSTEL', label: 'Hostel' }
];

const LISTING_TYPES = [
  { value: 'ENTIRE_PROPERTY', label: 'Entire property' },
  { value: 'PER_ROOM', label: 'Per room' }
];

const UNIVERSITIES = [
  { value: 'UDSM', label: 'University of Dar es Salaam (UDSM)' },
  { value: 'ARDHI', label: 'Ardhi University' },
  { value: 'MUHAS', label: 'MUHAS' },
  { value: 'DIT', label: 'DIT' }
];

const PAYMENT_FREQUENCIES = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'THREE_MONTHS', label: '3 months' },
  { value: 'SIX_MONTHS', label: '6 months' },
  { value: 'ONE_YEAR', label: '1 year' }
];

const GENDER_PREFERENCES = [
  { value: 'ANY', label: 'Any' },
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' }
];

const PAYOUT_PROVIDERS = [
  { value: 'NMB', label: 'NMB Bank' },
  { value: 'CRDB', label: 'CRDB Bank' },
  { value: 'NBC', label: 'NBC Bank' },
  { value: 'ABSA', label: 'Absa Bank Tanzania' },
  { value: 'STANBIC', label: 'Stanbic Bank' },
  { value: 'EXIM', label: 'Exim Bank' },
  { value: 'EQUITY', label: 'Equity Bank' },
  { value: 'NCBA', label: 'NCBA Bank' },
  { value: 'TPB', label: 'TPB Bank' },
  { value: 'ACCESS', label: 'Access Bank' },
  { value: 'BOA', label: 'Bank of Africa (BOA)' },
  { value: 'MPESA', label: 'M-Pesa' },
  { value: 'AIRTEL_MONEY', label: 'Airtel Money' },
  { value: 'TIGO_PESA', label: 'Tigo Pesa' },
  { value: 'HALOPESA', label: 'HaloPesa' },
  { value: 'OTHER', label: 'Other provider' }
];

const PHOTO_ANGLES = [
  { value: 'BEDROOM', label: 'Bedroom' },
  { value: 'KITCHEN', label: 'Kitchen' },
  { value: 'BATHROOM', label: 'Bathroom' },
  { value: 'EXTERIOR', label: 'Outside view' },
  { value: 'OTHER', label: 'Other' }
];

const REQUIRED_PHOTO_ANGLES = ['BEDROOM', 'KITCHEN', 'BATHROOM', 'EXTERIOR'];
const AI_CHECK_STATUS = {
  UNVERIFIED: 'UNVERIFIED',
  CHECKING: 'CHECKING',
  PASSED: 'PASSED',
  FAILED: 'FAILED',
  ERROR: 'ERROR'
};

const POLICIES = [
  'No fake listings',
  'No misleading prices',
  'No duplicate listings',
  'No discrimination (except gender preference for shared housing)',
  'No hidden charges',
  'Accurate location required',
  'Respect student safety standards'
];

const REGION_LOCATIONS = {
  'Dar es Salaam': ['Ubungo', 'Kinondoni', 'Ilala', 'Temeke', 'Kigamboni'],
  Arusha: ['Arusha City', 'Meru', 'Karatu', 'Longido', 'Monduli'],
  Dodoma: ['Dodoma Urban', 'Chamwino', 'Kondoa', 'Mpwapwa', 'Bahi'],
  Mwanza: ['Nyamagana', 'Ilemela', 'Magu', 'Misungwi', 'Sengerema'],
  Mbeya: ['Mbeya City', 'Chunya', 'Mbarali', 'Rungwe', 'Kyela'],
  Morogoro: ['Morogoro Urban', 'Mvomero', 'Kilosa', 'Kilombero', 'Gairo'],
  Tanga: ['Tanga City', 'Muheza', 'Korogwe', 'Pangani', 'Lushoto'],
  Pwani: ['Kibaha', 'Bagamoyo', 'Mkuranga', 'Kisarawe', 'Rufiji'],
  Zanzibar: ['Stone Town', 'Mjini', 'Magharibi', 'Kaskazini A', 'Kaskazini B']
};

const REGION_OPTIONS = Object.keys(REGION_LOCATIONS);

const LOCATION_TREE = {
  'Dar es Salaam': {
    Ilala: {
      Kivukoni: ['Sokoine Drive', 'Ocean Road', 'Mirambo Street'],
      Kariakoo: ['Msimbazi Street', 'Uhuru Street', 'Sikukuu Street'],
      'Upanga East': ['Ali Hassan Mwinyi Road', 'India Street', 'Mindu Street']
    },
    Kinondoni: {
      Mikocheni: ['Mwai Kibaki Road', 'Mikocheni B Road', 'Chole Road'],
      Sinza: ['Shekilango Road', 'Mori Road', 'Sokota Street'],
      Msasani: ['Haile Selassie Road', 'Slipway Road', 'Toure Drive']
    },
    Ubungo: {
      Ubungo: ['Morogoro Road', 'Sam Nujoma Road', 'Maji Chumvi Street'],
      Kimara: ['Kimara Stopover Road', 'Baruti Street', 'Korogwe Street'],
      Makuburi: ['Mbezi Road', 'Makuburi Kituoni Road', 'Changanyikeni Road']
    },
    Temeke: {
      Mbagala: ['Kilwa Road', 'Charambe Street', 'Chamazi Road'],
      Kurasini: ['Bandari Road', 'Kilwa Industrial Road', 'Kurasini Creek Road'],
      Changombe: ['Mikumi Road', 'Changombe Road', 'Nelson Mandela Road']
    },
    Kigamboni: {
      Kibada: ['Kibada Main Road', 'Kibugumo Street', 'Kisota Street'],
      Mjimwema: ['Mjimwema Road', 'Maweni Street', 'Kigamboni Ferry Road'],
      Tungi: ['Tungi Road', 'Mtaa wa Soko', 'Gezaulole Street']
    }
  },
  Arusha: {
    'Arusha City': {
      Sekei: ['Sokon I Road', 'Njiro Road', 'Simeon Road'],
      Njiro: ['Njiro Complex Road', 'Chuo Road', 'Moshono Road'],
      Themi: ['Old Moshi Road', 'Themi Street', 'Sakina Road']
    },
    Meru: {
      'Usa River': ['Usa River Road', 'Nkoaranga Street', 'Maji ya Chai Road'],
      Leguruki: ['Leguruki Road', 'Mulala Street', 'Kingori Road'],
      Tengeru: ['Tengeru Road', 'Kwa Mrombo Street', 'Maji ya Chai']
    }
  },
  Dodoma: {
    'Dodoma Urban': {
      Hazina: ['Makole Road', 'Hazina Street', 'Stendi Kuu Road'],
      Kikuyu: ['Kikuyu Road', 'Mtumba Road', 'Nzuguni Street'],
      Chamwino: ['Chamwino Road', 'Mwangaza Street', 'Ipala Road']
    },
    Kondoa: {
      Kondoa: ['Kondoa Main Road', 'Chemba Street', 'Soko Road'],
      Bereko: ['Bereko Road', 'Mnenia Street', 'Haubi Road']
    }
  },
  Mwanza: {
    Nyamagana: {
      Pamba: ['Makongoro Road', 'Pamba Road', 'Nyangoro Street'],
      Mkolani: ['Mkolani Road', 'Mabatini Street', 'Nyegezi Road']
    },
    Ilemela: {
      Nyegezi: ['Nyegezi Main Road', 'Bugando Road', 'Bwiru Street'],
      Bwiru: ['Bwiru Hill Road', 'Capri Point Road', 'Sangabuye Street']
    }
  },
  Mbeya: {
    'Mbeya City': {
      Iyunga: ['Uyole Road', 'Iyunga Street', 'Uzunguni Road'],
      Ruanda: ['Ruanda Road', 'Soweto Street', 'Mbalizi Road']
    },
    Chunya: {
      Chunya: ['Chunya Main Road', 'Lupa Road', 'Ifumbo Street'],
      Mkwajuni: ['Mkwajuni Road', 'Kambikatoto Street', 'Mbugani Road']
    }
  },
  Morogoro: {
    'Morogoro Urban': {
      Kichangani: ['Old Dar Road', 'Kichangani Street', 'Kingolwira Road'],
      Mazimbu: ['SUA Road', 'Mazimbu Street', 'Mji Mpya Road']
    },
    Kilosa: {
      Kilosa: ['Kilosa Road', 'Mikumi Road', 'Kidodi Street'],
      Mikumi: ['Mikumi Main Road', 'Ruaha Street', 'Mtua Road']
    }
  },
  Tanga: {
    'Tanga City': {
      Central: ['Raskazone Road', 'Hospital Road', 'Independence Avenue'],
      Ngamiani: ['Ngamiani Street', 'Mwanzange Road', 'Uwanja wa Ndege Road']
    },
    Muheza: {
      Muheza: ['Muheza Main Road', 'Amani Road', 'Maramba Street'],
      Maramba: ['Maramba Road', 'Kigombe Street', 'Misozwe Road']
    }
  },
  Pwani: {
    Kibaha: {
      Mailimoja: ['Mailimoja Road', 'Kwa Mfipa Street', 'Mlandizi Road'],
      Tumbi: ['Tumbi Road', 'Visiga Street', 'Kibaha Bypass']
    },
    Bagamoyo: {
      Dunda: ['Dunda Road', 'Kaole Street', 'Old Bagamoyo Road'],
      Magomeni: ['Magomeni Road', 'Fukayosi Street', 'Mapinga Road']
    }
  },
  Zanzibar: {
    'Stone Town': {
      Malindi: ['Mizingani Road', 'Mkunazini Street', 'Kenyatta Road'],
      'Forodhani': ['Forodhani Road', 'Shangani Street', 'Kelele Square']
    },
    Mjini: {
      Amani: ['Amani Street', 'Kiswandui Road', 'Mkunazini Road'],
      Mwembeladu: ['Mwembeladu Road', 'Jangombe Street', 'Amani Link']
    }
  }
};

const LIST_PROPERTY_DRAFT_KEY = 'campusstay.list_property_draft.v1';
const LIST_PROPERTY_DRAFT_VERSION = 1;
const DRAFTABLE_FIELDS = [
  'fullLegalName',
  'phoneNumber',
  'emailAddress',
  'accountType',
  'phoneOtpVerified',
  'emailVerified',
  'ownerPropertyRegion',
  'ownerPropertyLocation',
  'ownerPropertyLocationOther',
  'payoutProvider',
  'payoutProviderOther',
  'payoutAccountReference',
  'payoutAccountName',
  'linkedOwnerEmail',
  'dalaliLandlordPhone',
  'propertyTitle',
  'listingDescription',
  'propertyType',
  'listingType',
  'region',
  'district',
  'districtOther',
  'ward',
  'wardOther',
  'street',
  'streetOther',
  'nearbyUniversity',
  'mapPinUrl',
  'monthlyRent',
  'depositRequired',
  'depositRefundable',
  'dalaliCommission',
  'paymentFrequency',
  'bedrooms',
  'bathrooms',
  'furnished',
  'electricityIncluded',
  'waterIncluded',
  'parkingAvailable',
  'securityAvailable',
  'wifiAvailable',
  'genderPreference',
  'houseRules'
];

function normalizeStep(step) {
  if (!Number.isInteger(step)) {
    return 0;
  }
  return Math.max(0, Math.min(step, STEPS.length - 1));
}

function loadListingDraft() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(LIST_PROPERTY_DRAFT_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== LIST_PROPERTY_DRAFT_VERSION || typeof parsed !== 'object') {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function extractPolicyDraft(policyAccepted) {
  return POLICIES.reduce((acc, policy) => {
    acc[policy] = Boolean(policyAccepted?.[policy]);
    return acc;
  }, {});
}

function applyListingDraft(baseForm, draftForm) {
  if (!draftForm || typeof draftForm !== 'object') {
    return baseForm;
  }

  const merged = { ...baseForm };

  DRAFTABLE_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(draftForm, field)) {
      merged[field] = draftForm[field];
    }
  });

  merged.policyAccepted = extractPolicyDraft(draftForm.policyAccepted);
  return merged;
}

function saveListingDraft(formData, currentStep) {
  if (typeof window === 'undefined') {
    return;
  }

  const snapshot = DRAFTABLE_FIELDS.reduce((acc, field) => {
    acc[field] = formData[field];
    return acc;
  }, {});

  snapshot.policyAccepted = extractPolicyDraft(formData.policyAccepted);

  const payload = {
    version: LIST_PROPERTY_DRAFT_VERSION,
    savedAt: new Date().toISOString(),
    currentStep: normalizeStep(currentStep),
    formData: snapshot
  };

  window.localStorage.setItem(LIST_PROPERTY_DRAFT_KEY, JSON.stringify(payload));
}

function clearListingDraft() {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(LIST_PROPERTY_DRAFT_KEY);
}

function createInspectionState(overrides = {}) {
  return {
    status: AI_CHECK_STATUS.UNVERIFIED,
    message: 'Queued for AI inspection on submission.',
    confidence: null,
    detectedCategory: '',
    inspectedAt: '',
    model: '',
    ...overrides
  };
}

function createEmptyPhoto(angle = 'OTHER') {
  return {
    file: null,
    previewUrl: '',
    angle,
    inspection: createInspectionState()
  };
}

function createInitialForm() {
  return {
    fullLegalName: '',
    phoneNumber: '',
    emailAddress: '',
    accountType: 'OWNER',
    profilePhotoFile: null,
    nationalIdOrPassportFile: null,
    selfiePhotoFile: null,
    phoneOtpVerified: false,
    emailVerified: false,

    ownershipProofFile: null,
    ownerPropertyRegion: 'Dar es Salaam',
    ownerPropertyLocation: '',
    ownerPropertyLocationOther: '',
    payoutProvider: '',
    payoutProviderOther: '',
    payoutAccountReference: '',
    payoutAccountName: '',

    managerAuthorizationLetterFile: null,
    managerOwnerIdCopyFile: null,
    managementAgreementFile: null,
    linkedOwnerEmail: '',

    dalaliPermissionLetterFile: null,
    dalaliLandlordIdCopyFile: null,
    dalaliLandlordPhone: '',

    propertyTitle: '',
    listingDescription: '',
    propertyType: 'SINGLE_ROOM',
    listingType: 'PER_ROOM',

    region: 'Dar es Salaam',
    district: '',
    districtOther: '',
    ward: '',
    wardOther: '',
    street: '',
    streetOther: '',
    nearbyUniversity: 'UDSM',
    mapPinUrl: '',

    monthlyRent: '',
    depositRequired: '',
    depositRefundable: true,
    dalaliCommission: '',
    paymentFrequency: 'MONTHLY',

    bedrooms: 1,
    bathrooms: 1,
    furnished: false,
    electricityIncluded: false,
    waterIncluded: false,
    parkingAvailable: false,
    securityAvailable: false,
    wifiAvailable: false,
    genderPreference: 'ANY',
    houseRules: '',

    photos: [
      createEmptyPhoto('BEDROOM'),
      createEmptyPhoto('KITCHEN'),
      createEmptyPhoto('BATHROOM'),
      createEmptyPhoto('EXTERIOR')
    ],

    policyAccepted: POLICIES.reduce((acc, policy) => {
      acc[policy] = false;
      return acc;
    }, {})
  };
}

function mapOccupancyType(propertyType, listingType) {
  if (listingType === 'PER_ROOM') {
    if (propertyType === 'SINGLE_ROOM') {
      return 'SINGLE';
    }
    return 'SHARED';
  }

  if (propertyType === 'HOSTEL') {
    return 'SHARED';
  }

  if (propertyType === 'SINGLE_ROOM') {
    return 'SINGLE';
  }

  return 'ENTIRE_UNIT';
}

function createAddress(formData) {
  const location = resolveLocation(formData);

  const chunks = [location.street, location.ward, location.district, location.region]
    .map((item) => item.trim())
    .filter(Boolean);

  const assembled = chunks.join(', ');
  return assembled.length > 290 ? assembled.slice(0, 290) : assembled;
}

function fileLabel(file) {
  if (!file) {
    return 'Not uploaded';
  }
  const kb = Math.max(1, Math.round(file.size / 1024));
  return `${file.name} (${kb} KB)`;
}

function photoAngleLabel(value) {
  return PHOTO_ANGLES.find((item) => item.value === value)?.label || value;
}

function photoInspectionStatusLabel(status) {
  if (status === AI_CHECK_STATUS.CHECKING) {
    return 'Checking';
  }
  if (status === AI_CHECK_STATUS.PASSED) {
    return 'Verified';
  }
  if (status === AI_CHECK_STATUS.FAILED) {
    return 'Mismatch';
  }
  if (status === AI_CHECK_STATUS.ERROR) {
    return 'Error';
  }
  return 'Not Checked';
}

function photoInspectionStatusClass(status) {
  if (status === AI_CHECK_STATUS.CHECKING) {
    return 'is-checking';
  }
  if (status === AI_CHECK_STATUS.PASSED) {
    return 'is-pass';
  }
  if (status === AI_CHECK_STATUS.FAILED) {
    return 'is-fail';
  }
  if (status === AI_CHECK_STATUS.ERROR) {
    return 'is-error';
  }
  return 'is-unverified';
}

function formatInspectionSummary(inspection) {
  if (!inspection) {
    return 'Not checked yet.';
  }

  const categoryPart = inspection.detectedCategory
    ? `Detected: ${photoAngleLabel(inspection.detectedCategory)}`
    : '';

  const confidencePart =
    typeof inspection.confidence === 'number'
      ? `${Math.round(inspection.confidence * 100)}% confidence`
      : '';

  const metaParts = [categoryPart, confidencePart].filter(Boolean).join(' | ');

  if (metaParts && inspection.message) {
    return `${metaParts}. ${inspection.message}`;
  }

  if (metaParts) {
    return metaParts;
  }

  return inspection.message || 'Not checked yet.';
}

function ownerPhysicalAddress(formData) {
  if (!formData.ownerPropertyRegion) {
    return '';
  }

  if (formData.ownerPropertyLocation === 'OTHER') {
    const custom = formData.ownerPropertyLocationOther.trim();
    return custom ? `${custom}, ${formData.ownerPropertyRegion}` : formData.ownerPropertyRegion;
  }

  if (formData.ownerPropertyLocation) {
    return `${formData.ownerPropertyLocation}, ${formData.ownerPropertyRegion}`;
  }

  return formData.ownerPropertyRegion;
}

function normalizeRegionName(value) {
  const normalized = value ? value.replace(/\s+Region$/i, '').trim() : '';
  if (!normalized) {
    return '';
  }

  const match = [...new Set([...REGION_OPTIONS, ...Object.keys(LOCATION_TREE)])]
    .find((item) => item.toLowerCase() === normalized.toLowerCase());

  return match || normalized;
}

function resolveLocationPart(selected, customValue) {
  if (!selected) {
    return '';
  }
  if (selected === 'OTHER') {
    return (customValue || '').trim();
  }
  return selected.trim();
}

function resolveLocation(formData) {
  return {
    region: (formData.region || '').trim(),
    district: resolveLocationPart(formData.district, formData.districtOther),
    ward: resolveLocationPart(formData.ward, formData.wardOther),
    street: resolveLocationPart(formData.street, formData.streetOther)
  };
}

function getDistrictOptions(region) {
  return Object.keys(LOCATION_TREE[region] || {});
}

function getWardOptions(region, district) {
  if (!region || !district) {
    return [];
  }

  return Object.keys(LOCATION_TREE[region]?.[district] || {});
}

function getStreetOptions(region, district, ward) {
  if (!region || !district || !ward) {
    return [];
  }

  return LOCATION_TREE[region]?.[district]?.[ward] || [];
}

function mergeOptions(...lists) {
  const values = lists.flat().filter(Boolean);
  return [...new Set(values)];
}

function findCaseInsensitiveMatch(options, value) {
  if (!value) {
    return '';
  }
  return options.find((option) => option.toLowerCase() === value.toLowerCase()) || '';
}

function payoutProviderLabel(formData) {
  if (formData.payoutProvider === 'OTHER') {
    return formData.payoutProviderOther.trim() || 'Other';
  }

  const provider = PAYOUT_PROVIDERS.find((item) => item.value === formData.payoutProvider);
  return provider ? provider.label : '';
}

function buildEnrichedDescription(formData, validPhotos) {
  const location = resolveLocation(formData);

  const amenities = [
    formData.furnished ? 'Furnished' : 'Not furnished',
    formData.electricityIncluded ? 'Electricity included' : 'Electricity excluded',
    formData.waterIncluded ? 'Water included' : 'Water excluded',
    formData.parkingAvailable ? 'Parking available' : 'No parking',
    formData.securityAvailable ? 'Security available' : 'No dedicated security',
    formData.wifiAvailable ? 'WiFi available' : 'WiFi not included'
  ].join('; ');

  const photoLines = validPhotos
    .map((photo, index) => `${index + 1}. [${photo.angle}] Uploaded`)
    .join('\n');

  const policyList = Object.entries(formData.policyAccepted)
    .filter(([, accepted]) => accepted)
    .map(([policy]) => `- ${policy}`)
    .join('\n');

  const extended = [
    formData.listingDescription.trim(),
    '',
    'Structured Details:',
    `- Property Type: ${formData.propertyType}`,
    `- Listing Type: ${formData.listingType}`,
    `- Owner Physical Address: ${ownerPhysicalAddress(formData) || 'Not provided'}`,
    `- Region/District/Ward: ${location.region} / ${location.district} / ${location.ward}`,
    `- Street: ${location.street}`,
    `- Nearby University: ${formData.nearbyUniversity}`,
    `- Map Pin: ${formData.mapPinUrl}`,
    `- Monthly Rent: ${formData.monthlyRent} TZS`,
    `- Deposit Required: ${formData.depositRequired || 0} TZS`,
    `- Deposit Refundable: ${formData.depositRefundable ? 'Yes' : 'No'}`,
    `- Dalali Commission: ${formData.dalaliCommission || 0} TZS`,
    `- Payment Frequency: ${formData.paymentFrequency}`,
    `- Bedrooms/Bathrooms: ${formData.bedrooms}/${formData.bathrooms}`,
    `- Gender Preference: ${formData.genderPreference}`,
    `- House Rules: ${formData.houseRules || 'None provided'}`,
    `- Amenities: ${amenities}`,
    '',
    'Photo Evidence:',
    photoLines,
    '',
    'Accepted Policies:',
    policyList
  ].join('\n');

  if (extended.length <= 5000) {
    return extended;
  }

  return extended.slice(0, 5000);
}

export default function ListPropertyPage() {
  const { user, isAuthenticated, refreshMe } = useAuth();
  const [draftSnapshot] = useState(() => loadListingDraft());
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState(() => applyListingDraft(createInitialForm(), draftSnapshot?.formData));
  const [currentStep, setCurrentStep] = useState(() => normalizeStep(draftSnapshot?.currentStep));
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [draftRestored, setDraftRestored] = useState(Boolean(draftSnapshot?.formData));
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [geoHint, setGeoHint] = useState({
    region: '',
    district: '',
    ward: '',
    street: ''
  });

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      if (!isAuthenticated || user?.role !== 'LANDLORD') {
        return;
      }

      setLoadingProfile(true);
      try {
        const { data } = await apiClient.get('/landlord/profile');
        if (isMounted) {
          setProfile(data);
        }
        await refreshMe();
      } catch (err) {
        if (isMounted) {
          setError(extractErrorMessage(err));
        }
      } finally {
        if (isMounted) {
          setLoadingProfile(false);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, refreshMe, user?.role]);

  useEffect(() => {
    if (!user) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      fullLegalName: prev.fullLegalName || user.fullName || '',
      phoneNumber: prev.phoneNumber || user.phone || '',
      emailAddress: prev.emailAddress || user.email || ''
    }));
  }, [user]);

  const hasLandlordAccount = isAuthenticated && user?.role === 'LANDLORD';

  useEffect(() => {
    if (!hasLandlordAccount) {
      return;
    }

    const handle = window.setTimeout(() => {
      saveListingDraft(formData, currentStep);
    }, 250);

    return () => {
      window.clearTimeout(handle);
    };
  }, [currentStep, formData, hasLandlordAccount]);

  const canSubmit = useMemo(() => {
    return hasLandlordAccount;
  }, [hasLandlordAccount]);

  const validPhotos = useMemo(() => {
    return formData.photos.filter((photo) => Boolean(photo.file));
  }, [formData.photos]);

  const photoAiCoverage = useMemo(() => {
    return REQUIRED_PHOTO_ANGLES.reduce((acc, angle) => {
      const matching = validPhotos.filter((photo) => photo.angle === angle);
      const statuses = matching.map((photo) => photo.inspection?.status || AI_CHECK_STATUS.UNVERIFIED);

      acc[angle] = {
        count: matching.length,
        hasPassed: statuses.includes(AI_CHECK_STATUS.PASSED),
        checking: statuses.includes(AI_CHECK_STATUS.CHECKING),
        hasProblem: statuses.includes(AI_CHECK_STATUS.FAILED) || statuses.includes(AI_CHECK_STATUS.ERROR)
      };
      return acc;
    }, {});
  }, [validPhotos]);

  const photoChecksInProgress = useMemo(() => {
    return validPhotos.some((photo) => (photo.inspection?.status || AI_CHECK_STATUS.UNVERIFIED) === AI_CHECK_STATUS.CHECKING);
  }, [validPhotos]);

  const ownerLocationOptions = useMemo(() => {
    return REGION_LOCATIONS[formData.ownerPropertyRegion] || [];
  }, [formData.ownerPropertyRegion]);

  const resolvedLocation = useMemo(() => {
    return resolveLocation(formData);
  }, [formData]);

  const regionDropdownOptions = useMemo(() => {
    return mergeOptions(Object.keys(LOCATION_TREE), REGION_OPTIONS, geoHint.region);
  }, [geoHint.region]);

  const districtDropdownOptions = useMemo(() => {
    return mergeOptions(getDistrictOptions(formData.region), geoHint.district, resolvedLocation.district);
  }, [formData.region, geoHint.district, resolvedLocation.district]);

  const effectiveDistrictForNested = useMemo(() => {
    if (formData.district && formData.district !== 'OTHER') {
      return formData.district;
    }

    return findCaseInsensitiveMatch(getDistrictOptions(formData.region), geoHint.district);
  }, [formData.district, formData.region, geoHint.district]);

  const wardDropdownOptions = useMemo(() => {
    return mergeOptions(
      getWardOptions(formData.region, effectiveDistrictForNested),
      geoHint.ward,
      resolvedLocation.ward
    );
  }, [effectiveDistrictForNested, formData.region, geoHint.ward, resolvedLocation.ward]);

  const effectiveWardForNested = useMemo(() => {
    if (formData.ward && formData.ward !== 'OTHER') {
      return formData.ward;
    }

    return findCaseInsensitiveMatch(getWardOptions(formData.region, effectiveDistrictForNested), geoHint.ward);
  }, [formData.region, formData.ward, effectiveDistrictForNested, geoHint.ward]);

  const streetDropdownOptions = useMemo(() => {
    return mergeOptions(
      getStreetOptions(formData.region, effectiveDistrictForNested, effectiveWardForNested),
      geoHint.street,
      resolvedLocation.street
    );
  }, [effectiveDistrictForNested, effectiveWardForNested, formData.region, geoHint.street, resolvedLocation.street]);

  const allPoliciesAccepted = useMemo(() => {
    return Object.values(formData.policyAccepted).every(Boolean);
  }, [formData.policyAccepted]);

  const checklist = useMemo(() => {
    return [
      {
        id: 'account',
        label: 'Landlord account',
        done: hasLandlordAccount,
        detail: hasLandlordAccount ? user?.email : 'Create or login with landlord account'
      },
      {
        id: 'verification',
        label: 'Account verification status',
        done: hasLandlordAccount && Boolean(profile),
        detail: profile?.verificationStatus
          ? `${profile.verificationStatus} (does not block listing submission)`
          : 'Pending (does not block listing submission)'
      },
      {
        id: 'listing',
        label: 'Submission readiness',
        done: canSubmit && allPoliciesAccepted,
        detail: canSubmit ? 'Ready to submit. After submission, wait for admin approval.' : 'Login with landlord account'
      }
    ];
  }, [allPoliciesAccepted, canSubmit, hasLandlordAccount, profile, user?.email]);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateFileField = (field, file) => {
    setFormData((prev) => ({ ...prev, [field]: file || null }));
  };

  const updateBooleanField = (field) => {
    setFormData((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const updatePolicy = (policy) => {
    setFormData((prev) => ({
      ...prev,
      policyAccepted: {
        ...prev.policyAccepted,
        [policy]: !prev.policyAccepted[policy]
      }
    }));
  };

  const clearDraftAndReset = () => {
    formData.photos.forEach((photo) => {
      if (photo.previewUrl) {
        URL.revokeObjectURL(photo.previewUrl);
      }
    });

    clearListingDraft();
    setDraftRestored(false);
    setError('');
    setSuccess('Saved draft cleared.');
    setCurrentStep(0);
    setFormData(() => ({
      ...createInitialForm(),
      fullLegalName: user?.fullName || '',
      phoneNumber: user?.phone || '',
      emailAddress: user?.email || ''
    }));
  };

  const updatePhotoFile = (index, file) => {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.map((photo, idx) => {
        if (idx !== index) {
          return photo;
        }

        if (photo.previewUrl) {
          URL.revokeObjectURL(photo.previewUrl);
        }

        if (!file) {
          return {
            ...photo,
            file: null,
            previewUrl: '',
            inspection: createInspectionState()
          };
        }

        return {
          ...photo,
          file,
          previewUrl: URL.createObjectURL(file),
          inspection: createInspectionState({
            message: 'Queued for AI inspection on submission.'
          })
        };
      })
    }));
  };

  const runPhotoInspection = async (index) => {
    const target = formData.photos[index];
    if (!target?.file) {
      setError(`Upload ${photoAngleLabel(target?.angle || 'photo')} before submission.`);
      return 'error';
    }

    if (target.angle === 'OTHER') {
      setFormData((prev) => ({
        ...prev,
        photos: prev.photos.map((photo, idx) =>
          idx === index
            ? {
                ...photo,
                inspection: createInspectionState({
                  status: AI_CHECK_STATUS.PASSED,
                  message: "AI check is optional for 'Other' angle.",
                  confidence: 1,
                  detectedCategory: 'OTHER'
                })
              }
            : photo
        )
      }));
      return 'passed';
    }

    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.map((photo, idx) =>
        idx === index
          ? {
              ...photo,
              inspection: createInspectionState({
                status: AI_CHECK_STATUS.CHECKING,
                message: 'Running AI inspection...'
              })
            }
          : photo
      )
    }));

    const payload = new FormData();
    payload.append('file', target.file);
    payload.append('expectedAngle', target.angle);

    try {
      const { data } = await apiClient.post('/landlord/listings/photos/inspect', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000
      });

      setFormData((prev) => ({
        ...prev,
        photos: prev.photos.map((photo, idx) =>
          idx === index
            ? {
                ...photo,
                inspection: createInspectionState({
                  status: data.passed ? AI_CHECK_STATUS.PASSED : AI_CHECK_STATUS.FAILED,
                  message: data.reason || (data.passed ? 'AI verified this photo.' : 'AI says this image does not match selected angle.'),
                  confidence: Number.isFinite(Number(data.confidence)) ? Number(data.confidence) : null,
                  detectedCategory: data.detectedCategory || '',
                  inspectedAt: data.inspectedAt || '',
                  model: data.model || ''
                })
              }
            : photo
        )
      }));

      return data.passed ? 'passed' : 'failed';
    } catch (err) {
      const message = extractErrorMessage(err);
      setFormData((prev) => ({
        ...prev,
        photos: prev.photos.map((photo, idx) =>
          idx === index
            ? {
                ...photo,
                inspection: createInspectionState({
                  status: AI_CHECK_STATUS.ERROR,
                  message
                })
              }
            : photo
        )
      }));
      return 'error';
    }
  };

  const runRequiredPhotoInspections = async () => {
    const currentPhotos = formData.photos.map((photo, index) => ({ photo, index }));
    const requiredTargets = REQUIRED_PHOTO_ANGLES
      .map((requiredAngle) => currentPhotos.find(({ photo }) => photo.angle === requiredAngle))
      .filter(Boolean);

    const results = await Promise.all(
      requiredTargets.map((target) => {
        if (!target?.photo?.file) {
          return Promise.resolve('error');
        }
        return runPhotoInspection(target.index);
      })
    );

    return {
      hasMismatch: results.includes('failed'),
      hasAiErrors: results.includes('error'),
      passedCount: results.filter((result) => result === 'passed').length
    };
  };

  const uploadListingPhotos = async (listingId, photos) => {
    for (const photo of photos) {
      if (!photo?.file) {
        continue;
      }

      const payload = new FormData();
      payload.append('file', photo.file);
      payload.append('angle', photo.angle);

      await apiClient.post(`/landlord/listings/${listingId}/photos`, payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000
      });
    }
  };

  const handleUseCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setGeoError('Location services are not supported in this browser.');
      return;
    }

    setGeoLoading(true);
    setGeoError('');

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0
        });
      });

      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      const mapUrl = `https://maps.google.com/?q=${latitude},${longitude}`;

      let detected = {
        region: '',
        district: '',
        ward: '',
        street: ''
      };

      try {
        const reverseResponse = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
        );

        if (reverseResponse.ok) {
          const reverseData = await reverseResponse.json();
          const address = reverseData.address || {};

          detected = {
            region: normalizeRegionName(address.state || address.region || address.state_district || ''),
            district: (address.county || address.city_district || address.city || '').trim(),
            ward: (address.suburb || address.neighbourhood || address.quarter || address.village || '').trim(),
            street: (address.road || address.residential || address.pedestrian || address.path || '').trim()
          };
        }
      } catch {
        // Reverse geocoding is best effort; map pin still gets set from geolocation coordinates.
      }

      setGeoHint(detected);

      setFormData((prev) => {
        const next = {
          ...prev,
          mapPinUrl: mapUrl
        };

        if (detected.region) {
          next.region = detected.region;
          next.district = '';
          next.districtOther = '';
          next.ward = '';
          next.wardOther = '';
          next.street = '';
          next.streetOther = '';
        }

        if (detected.district) {
          const districtMatch = findCaseInsensitiveMatch(getDistrictOptions(next.region), detected.district);
          if (districtMatch) {
            next.district = districtMatch;
            next.districtOther = '';
          } else {
            next.district = 'OTHER';
            next.districtOther = detected.district;
          }
        }

        const districtForWards = next.district === 'OTHER' ? '' : next.district;
        if (detected.ward) {
          const wardMatch = findCaseInsensitiveMatch(getWardOptions(next.region, districtForWards), detected.ward);
          if (wardMatch) {
            next.ward = wardMatch;
            next.wardOther = '';
          } else {
            next.ward = 'OTHER';
            next.wardOther = detected.ward;
          }
        }

        const wardForStreets = next.ward === 'OTHER' ? '' : next.ward;
        if (detected.street) {
          const streetMatch = findCaseInsensitiveMatch(
            getStreetOptions(next.region, districtForWards, wardForStreets),
            detected.street
          );
          if (streetMatch) {
            next.street = streetMatch;
            next.streetOther = '';
          } else {
            next.street = 'OTHER';
            next.streetOther = detected.street;
          }
        }

        return next;
      });

      if (!detected.region && !detected.district && !detected.ward && !detected.street) {
        setGeoError('Location captured. Complete region/district/ward/street from dropdowns.');
      }
    } catch {
      setGeoError('Unable to access location. Allow browser location permission and try again.');
    } finally {
      setGeoLoading(false);
    }
  };

  const validateStep = (stepIndex) => {
    if (stepIndex === 0) {
      if (!formData.accountType) {
        return 'Account type is required.';
      }
      if (formData.fullLegalName.trim().length < 5) {
        return 'Full legal name is required.';
      }
      if (!/^\+?[0-9]{9,15}$/.test(formData.phoneNumber.trim())) {
        return 'Valid phone number is required.';
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.emailAddress.trim())) {
        return 'Valid email address is required.';
      }
      if (!formData.phoneOtpVerified) {
        return 'Phone OTP verification is required.';
      }
      if (!formData.emailVerified) {
        return 'Email verification is required.';
      }
      if (!formData.profilePhotoFile) {
        return 'Profile photo is required.';
      }
      if (!formData.nationalIdOrPassportFile) {
        return 'National ID (NIDA) or passport upload is required.';
      }
      if (!formData.selfiePhotoFile) {
        return 'Selfie photo is required for identity verification.';
      }

      if (formData.accountType === 'OWNER') {
        if (!formData.ownershipProofFile) {
          return 'Proof of property ownership is required for owners.';
        }
        if (!formData.ownerPropertyRegion) {
          return 'Physical property region is required for owners.';
        }
        if (!formData.ownerPropertyLocation) {
          return 'Physical property location is required for owners.';
        }
        if (formData.ownerPropertyLocation === 'OTHER' && !formData.ownerPropertyLocationOther.trim()) {
          return 'Please enter the custom owner property location.';
        }
        if (!formData.payoutProvider) {
          return 'Please select a bank or payout provider.';
        }
        if (formData.payoutProvider === 'OTHER' && !formData.payoutProviderOther.trim()) {
          return 'Please enter the custom payout provider name.';
        }
        if (!formData.payoutAccountReference.trim()) {
          return 'Account number or mobile wallet number is required.';
        }
      }

      if (formData.accountType === 'MANAGER') {
        if (!formData.managerAuthorizationLetterFile) {
          return 'Signed authorization letter is required for managers.';
        }
        if (!formData.managerOwnerIdCopyFile) {
          return 'Owner ID copy is required for managers.';
        }
        if (!formData.linkedOwnerEmail.trim()) {
          return 'Linked owner email is required for manager approval workflow.';
        }
      }

      if (formData.accountType === 'DALALI') {
        if (!formData.dalaliPermissionLetterFile) {
          return 'Signed listing permission letter is required for dalali.';
        }
        if (!formData.dalaliLandlordIdCopyFile) {
          return 'Landlord ID copy is required for dalali.';
        }
        if (!/^\+?[0-9]{9,15}$/.test(formData.dalaliLandlordPhone.trim())) {
          return 'Valid landlord phone number is required for dalali.';
        }
      }

      if (formData.propertyTitle.trim().length < 10) {
        return 'Property title must be at least 10 characters.';
      }

      if (formData.listingDescription.trim().length < 40) {
        return 'Listing description must be at least 40 characters.';
      }
    }

    if (stepIndex === 1) {
      const selectedLocation = resolveLocation(formData);
      if (!selectedLocation.region || !selectedLocation.district || !selectedLocation.ward || !selectedLocation.street) {
        return 'Region, district, ward, and street are required from dropdown selections.';
      }

      if (!formData.mapPinUrl.trim()) {
        return 'Google map pin location is required.';
      }

      const monthlyRent = Number(formData.monthlyRent);
      const deposit = Number(formData.depositRequired || 0);
      const dalaliCommission = Number(formData.dalaliCommission || 0);

      if (!Number.isFinite(monthlyRent) || monthlyRent < 50000) {
        return 'Monthly rent must be at least 50,000 TZS.';
      }

      if (!Number.isFinite(deposit) || deposit < 0) {
        return 'Deposit required cannot be negative.';
      }

      if (!Number.isFinite(dalaliCommission) || dalaliCommission < 0) {
        return 'Dalali commission cannot be negative.';
      }

      if (Number(formData.bedrooms) < 0 || Number(formData.bedrooms) > 20) {
        return 'Bedrooms must be between 0 and 20.';
      }

      if (Number(formData.bathrooms) < 1 || Number(formData.bathrooms) > 20) {
        return 'Bathrooms must be between 1 and 20.';
      }
    }

    if (stepIndex === 2) {
      const missingRequired = REQUIRED_PHOTO_ANGLES.filter(
        (angle) => !formData.photos.some((photo) => photo.angle === angle && photo.file)
      );
      if (missingRequired.length > 0) {
        return `Upload all required photos: ${missingRequired.map(photoAngleLabel).join(', ')}.`;
      }
    }

    if (stepIndex === 3) {
      if (!allPoliciesAccepted) {
        return 'All platform policies must be accepted before submission.';
      }
    }

    return null;
  };

  const setStep = (index) => {
    if (index <= currentStep) {
      setError('');
      setCurrentStep(index);
      return;
    }

    for (let step = currentStep; step < index; step += 1) {
      const stepError = validateStep(step);
      if (stepError) {
        setError(stepError);
        return;
      }
    }

    setError('');
    setCurrentStep(index);
  };

  const goNext = () => {
    const stepError = validateStep(currentStep);
    if (stepError) {
      setError(stepError);
      return;
    }

    setError('');
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setError('');
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const submitListing = async () => {
    setError('');
    setSuccess('');

    for (let step = 0; step < STEPS.length; step += 1) {
      const stepError = validateStep(step);
      if (stepError) {
        setCurrentStep(step);
        setError(stepError);
        return;
      }
    }

    if (!hasLandlordAccount) {
      setError('Login with a landlord account to submit a listing.');
      return;
    }

    setSubmitting(true);
    try {
      setSuccess('Running AI inspection for required photos...');
      const inspectionResult = await runRequiredPhotoInspections();
      if (inspectionResult.hasMismatch) {
        setCurrentStep(2);
        setSuccess('');
        setError('AI inspection failed for one or more required photos. Upload clearer matching photos and submit again.');
        return;
      }

      const backendPayload = {
        universityCode: formData.nearbyUniversity,
        title: formData.propertyTitle.trim(),
        description: buildEnrichedDescription(formData, validPhotos),
        address: createAddress(formData),
        rentAmount: Number(formData.monthlyRent),
        bedrooms: Number(formData.bedrooms),
        bathrooms: Number(formData.bathrooms),
        occupancyType: mapOccupancyType(formData.propertyType, formData.listingType)
      };
      const photosToUpload = validPhotos.map((photo) => ({ file: photo.file, angle: photo.angle }));

      if (inspectionResult.hasAiErrors) {
        setSuccess('AI inspection was partially unavailable. Listing will proceed to admin/manual review.');
      } else {
        setSuccess('AI inspection passed. Submitting listing...');
      }
      const { data: createdListing } = await apiClient.post('/landlord/listings', backendPayload);
      setSuccess('Listing saved. Uploading room photos...');
      await uploadListingPhotos(createdListing.id, photosToUpload);

      formData.photos.forEach((photo) => {
        if (photo.previewUrl) {
          URL.revokeObjectURL(photo.previewUrl);
        }
      });
      setFormData(() => ({
        ...createInitialForm(),
        fullLegalName: user?.fullName || '',
        phoneNumber: user?.phone || '',
        emailAddress: user?.email || ''
      }));
      clearListingDraft();
      setDraftRestored(false);
      setCurrentStep(0);
      setSuccess('Listing submitted successfully. Please wait for admin approval before it goes live.');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const currentStepMeta = STEPS[currentStep];

  const renderBasicsStep = () => {
    return (
      <div className="list-flow-grid">
        <div className="list-flow-field list-flow-field--full">
          <p className="list-flow-label">Account Type</p>
          <div className="list-flow-role-grid">
            {ACCOUNT_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                className={`list-flow-role-card ${formData.accountType === type.value ? 'is-active' : ''}`}
                onClick={() => updateField('accountType', type.value)}
                disabled={submitting}
              >
                <strong>{type.label}</strong>
                <span>{type.description}</span>
              </button>
            ))}
          </div>
        </div>

        <label className="list-flow-field">
          Full Legal Name
          <input
            value={formData.fullLegalName}
            onChange={(event) => updateField('fullLegalName', event.target.value)}
            placeholder="As on legal documents"
            disabled={submitting}
          />
        </label>

        <label className="list-flow-field">
          Phone Number
          <input
            value={formData.phoneNumber}
            onChange={(event) => updateField('phoneNumber', event.target.value)}
            placeholder="+2557XXXXXXXX"
            disabled={submitting}
          />
        </label>

        <label className="list-flow-field">
          Email Address
          <input
            type="email"
            value={formData.emailAddress}
            onChange={(event) => updateField('emailAddress', event.target.value)}
            placeholder="you@example.com"
            disabled={submitting}
          />
        </label>

        <div className="list-flow-field">
          <p className="list-flow-label">Verification Checks</p>
          <div className="list-flow-toggle-row">
            <button type="button" className={`list-flow-verify-chip ${formData.phoneOtpVerified ? 'is-verified' : ''}`} onClick={() => updateBooleanField('phoneOtpVerified')} disabled={submitting}>
              {formData.phoneOtpVerified ? 'Phone OTP Verified' : 'Mark Phone OTP as Verified (Testing)'}
            </button>
            <button type="button" className={`list-flow-verify-chip ${formData.emailVerified ? 'is-verified' : ''}`} onClick={() => updateBooleanField('emailVerified')} disabled={submitting}>
              {formData.emailVerified ? 'Email Verified' : 'Mark Email as Verified (Testing)'}
            </button>
          </div>
        </div>

        <label className="list-flow-field">
          Profile Photo Upload
          <input
            type="file"
            accept="image/*"
            onChange={(event) => updateFileField('profilePhotoFile', event.target.files?.[0] || null)}
            disabled={submitting}
          />
          <span className="list-flow-file-name">{fileLabel(formData.profilePhotoFile)}</span>
        </label>

        <label className="list-flow-field">
          NIDA / Passport Upload
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(event) => updateFileField('nationalIdOrPassportFile', event.target.files?.[0] || null)}
            disabled={submitting}
          />
          <span className="list-flow-file-name">{fileLabel(formData.nationalIdOrPassportFile)}</span>
        </label>

        <label className="list-flow-field">
          Selfie Photo Upload
          <input
            type="file"
            accept="image/*"
            onChange={(event) => updateFileField('selfiePhotoFile', event.target.files?.[0] || null)}
            disabled={submitting}
          />
          <span className="list-flow-file-name">{fileLabel(formData.selfiePhotoFile)}</span>
        </label>

        {formData.accountType === 'OWNER' ? (
          <>
            <label className="list-flow-field">
              Ownership Proof Upload
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(event) => updateFileField('ownershipProofFile', event.target.files?.[0] || null)}
                disabled={submitting}
              />
              <span className="list-flow-file-name">{fileLabel(formData.ownershipProofFile)}</span>
            </label>
            <label className="list-flow-field">
              Physical Property Region (Owner)
              <select
                value={formData.ownerPropertyRegion}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    ownerPropertyRegion: event.target.value,
                    ownerPropertyLocation: '',
                    ownerPropertyLocationOther: ''
                  }))
                }
                disabled={submitting}
              >
                {REGION_OPTIONS.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </label>
            <label className="list-flow-field">
              Physical Property Location (Owner)
              <select
                value={formData.ownerPropertyLocation}
                onChange={(event) => updateField('ownerPropertyLocation', event.target.value)}
                disabled={submitting}
              >
                <option value="">Select location</option>
                {ownerLocationOptions.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
                <option value="OTHER">Other location</option>
              </select>
            </label>
            {formData.ownerPropertyLocation === 'OTHER' ? (
              <label className="list-flow-field">
                Custom Owner Location
                <input
                  value={formData.ownerPropertyLocationOther}
                  onChange={(event) => updateField('ownerPropertyLocationOther', event.target.value)}
                  placeholder="Enter custom location name"
                  disabled={submitting}
                />
              </label>
            ) : null}
            <label className="list-flow-field list-flow-field--full">
              Bank / Mobile Money Provider
              <select
                value={formData.payoutProvider}
                onChange={(event) => updateField('payoutProvider', event.target.value)}
                disabled={submitting}
              >
                <option value="">Select provider</option>
                {PAYOUT_PROVIDERS.map((provider) => (
                  <option key={provider.value} value={provider.value}>
                    {provider.label}
                  </option>
                ))}
              </select>
            </label>
            {formData.payoutProvider === 'OTHER' ? (
              <label className="list-flow-field">
                Custom Provider Name
                <input
                  value={formData.payoutProviderOther}
                  onChange={(event) => updateField('payoutProviderOther', event.target.value)}
                  placeholder="Enter provider name"
                  disabled={submitting}
                />
              </label>
            ) : null}
            <label className="list-flow-field">
              Account / Wallet Number
              <input
                value={formData.payoutAccountReference}
                onChange={(event) => updateField('payoutAccountReference', event.target.value)}
                placeholder="Account number or mobile wallet number"
                disabled={submitting}
              />
            </label>
            <label className="list-flow-field">
              Account Name
              <input
                value={formData.payoutAccountName}
                onChange={(event) => updateField('payoutAccountName', event.target.value)}
                placeholder="Account holder name (optional)"
                disabled={submitting}
              />
            </label>
          </>
        ) : null}

        {formData.accountType === 'MANAGER' ? (
          <>
            <label className="list-flow-field">
              Signed Authorization Letter Upload
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(event) => updateFileField('managerAuthorizationLetterFile', event.target.files?.[0] || null)}
                disabled={submitting}
              />
              <span className="list-flow-file-name">{fileLabel(formData.managerAuthorizationLetterFile)}</span>
            </label>
            <label className="list-flow-field">
              Owner ID Copy Upload
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(event) => updateFileField('managerOwnerIdCopyFile', event.target.files?.[0] || null)}
                disabled={submitting}
              />
              <span className="list-flow-file-name">{fileLabel(formData.managerOwnerIdCopyFile)}</span>
            </label>
            <label className="list-flow-field">
              Management Agreement Upload (optional)
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(event) => updateFileField('managementAgreementFile', event.target.files?.[0] || null)}
                disabled={submitting}
              />
              <span className="list-flow-file-name">{fileLabel(formData.managementAgreementFile)}</span>
            </label>
            <label className="list-flow-field">
              Linked Owner Email
              <input
                type="email"
                value={formData.linkedOwnerEmail}
                onChange={(event) => updateField('linkedOwnerEmail', event.target.value)}
                placeholder="owner@example.com"
                disabled={submitting}
              />
            </label>
          </>
        ) : null}

        {formData.accountType === 'DALALI' ? (
          <>
            <label className="list-flow-field">
              Listing Permission Letter Upload
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(event) => updateFileField('dalaliPermissionLetterFile', event.target.files?.[0] || null)}
                disabled={submitting}
              />
              <span className="list-flow-file-name">{fileLabel(formData.dalaliPermissionLetterFile)}</span>
            </label>
            <label className="list-flow-field">
              Landlord ID Copy Upload
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(event) => updateFileField('dalaliLandlordIdCopyFile', event.target.files?.[0] || null)}
                disabled={submitting}
              />
              <span className="list-flow-file-name">{fileLabel(formData.dalaliLandlordIdCopyFile)}</span>
            </label>
            <label className="list-flow-field">
              Landlord Phone Number
              <input
                value={formData.dalaliLandlordPhone}
                onChange={(event) => updateField('dalaliLandlordPhone', event.target.value)}
                placeholder="+2557XXXXXXXX"
                disabled={submitting}
              />
            </label>
          </>
        ) : null}

        <label className="list-flow-field list-flow-field--full">
          Property Title
          <input
            value={formData.propertyTitle}
            onChange={(event) => updateField('propertyTitle', event.target.value)}
            placeholder="e.g., 2 Bedroom Apartment near UDSM"
            disabled={submitting}
          />
        </label>

        <div className="list-flow-field">
          <p className="list-flow-label">Property Type</p>
          <select value={formData.propertyType} onChange={(event) => updateField('propertyType', event.target.value)} disabled={submitting}>
            {PROPERTY_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div className="list-flow-field">
          <p className="list-flow-label">Listing Type</p>
          <select value={formData.listingType} onChange={(event) => updateField('listingType', event.target.value)} disabled={submitting}>
            {LISTING_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <label className="list-flow-field list-flow-field--full">
          Description
          <textarea
            value={formData.listingDescription}
            onChange={(event) => updateField('listingDescription', event.target.value)}
            minLength={40}
            maxLength={3000}
            placeholder="Describe the room and surroundings in detail for students."
            disabled={submitting}
          />
          <span className="list-flow-counter">{formData.listingDescription.length}/3000</span>
        </label>
      </div>
    );
  };

  const renderLocationAndPriceStep = () => {
    return (
      <div className="list-flow-grid">
        <label className="list-flow-field">
          Region
          <select
            value={formData.region}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                region: event.target.value,
                district: '',
                districtOther: '',
                ward: '',
                wardOther: '',
                street: '',
                streetOther: ''
              }))
            }
            disabled={submitting || geoLoading}
          >
            <option value="">Select region</option>
            {regionDropdownOptions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </label>

        <label className="list-flow-field">
          District
          <select
            value={formData.district}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                district: event.target.value,
                ward: '',
                wardOther: '',
                street: '',
                streetOther: ''
              }))
            }
            disabled={submitting || geoLoading || !formData.region}
          >
            <option value="">Select district</option>
            {districtDropdownOptions.map((district) => (
              <option key={district} value={district}>
                {district}
              </option>
            ))}
            <option value="OTHER">Other district</option>
          </select>
        </label>
        {formData.district === 'OTHER' ? (
          <label className="list-flow-field">
            Custom District
            <input
              value={formData.districtOther}
              onChange={(event) => updateField('districtOther', event.target.value)}
              placeholder="Enter district"
              disabled={submitting || geoLoading}
            />
          </label>
        ) : null}

        <label className="list-flow-field">
          Ward
          <select
            value={formData.ward}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                ward: event.target.value,
                street: '',
                streetOther: ''
              }))
            }
            disabled={submitting || geoLoading || !formData.region}
          >
            <option value="">Select ward</option>
            {wardDropdownOptions.map((ward) => (
              <option key={ward} value={ward}>
                {ward}
              </option>
            ))}
            <option value="OTHER">Other ward</option>
          </select>
        </label>
        {formData.ward === 'OTHER' ? (
          <label className="list-flow-field">
            Custom Ward
            <input
              value={formData.wardOther}
              onChange={(event) => updateField('wardOther', event.target.value)}
              placeholder="Enter ward"
              disabled={submitting || geoLoading}
            />
          </label>
        ) : null}

        <label className="list-flow-field">
          Street
          <select
            value={formData.street}
            onChange={(event) => updateField('street', event.target.value)}
            disabled={submitting || geoLoading || !formData.region}
          >
            <option value="">Select street</option>
            {streetDropdownOptions.map((street) => (
              <option key={street} value={street}>
                {street}
              </option>
            ))}
            <option value="OTHER">Other street</option>
          </select>
        </label>
        {formData.street === 'OTHER' ? (
          <label className="list-flow-field">
            Custom Street
            <input
              value={formData.streetOther}
              onChange={(event) => updateField('streetOther', event.target.value)}
              placeholder="Enter street"
              disabled={submitting || geoLoading}
            />
          </label>
        ) : null}

        <label className="list-flow-field">
          Nearby University
          <select value={formData.nearbyUniversity} onChange={(event) => updateField('nearbyUniversity', event.target.value)} disabled={submitting}>
            {UNIVERSITIES.map((university) => (
              <option key={university.value} value={university.value}>
                {university.label}
              </option>
            ))}
          </select>
        </label>

        <div className="list-flow-field">
          <p className="list-flow-label">Google Map Pin</p>
          <div className="list-flow-inline-actions">
            <button type="button" className="btn btn--ghost btn--small" onClick={handleUseCurrentLocation} disabled={submitting || geoLoading}>
              {geoLoading ? 'Getting location...' : 'Use My Current Location'}
            </button>
          </div>
          <input
            type="url"
            value={formData.mapPinUrl}
            onChange={(event) => updateField('mapPinUrl', event.target.value)}
            placeholder="https://maps.google.com/?q=latitude,longitude"
            disabled={submitting}
          />
          {geoError ? <span className="error-text">{geoError}</span> : null}
        </div>

        <label className="list-flow-field">
          Monthly Rent (TZS)
          <input
            type="number"
            min="50000"
            value={formData.monthlyRent}
            onChange={(event) => updateField('monthlyRent', event.target.value)}
            disabled={submitting}
          />
        </label>

        <label className="list-flow-field">
          Deposit Required (TZS)
          <input
            type="number"
            min="0"
            value={formData.depositRequired}
            onChange={(event) => updateField('depositRequired', event.target.value)}
            disabled={submitting}
          />
        </label>

        <label className="list-flow-field">
          Deposit Refundable?
          <select
            value={formData.depositRefundable ? 'YES' : 'NO'}
            onChange={(event) => updateField('depositRefundable', event.target.value === 'YES')}
            disabled={submitting}
          >
            <option value="YES">Yes</option>
            <option value="NO">No</option>
          </select>
        </label>

        <label className="list-flow-field">
          Dalali Commission (TZS)
          <input
            type="number"
            min="0"
            value={formData.dalaliCommission}
            onChange={(event) => updateField('dalaliCommission', event.target.value)}
            disabled={submitting}
          />
        </label>

        <label className="list-flow-field">
          Payment Frequency
          <select value={formData.paymentFrequency} onChange={(event) => updateField('paymentFrequency', event.target.value)} disabled={submitting}>
            {PAYMENT_FREQUENCIES.map((frequency) => (
              <option key={frequency.value} value={frequency.value}>
                {frequency.label}
              </option>
            ))}
          </select>
        </label>

        <label className="list-flow-field">
          Bedrooms
          <input
            type="number"
            min="0"
            max="20"
            value={formData.bedrooms}
            onChange={(event) => updateField('bedrooms', Number(event.target.value))}
            disabled={submitting}
          />
        </label>

        <label className="list-flow-field">
          Bathrooms
          <input
            type="number"
            min="1"
            max="20"
            value={formData.bathrooms}
            onChange={(event) => updateField('bathrooms', Number(event.target.value))}
            disabled={submitting}
          />
        </label>

        <div className="list-flow-field list-flow-field--full">
          <p className="list-flow-label">Property Details</p>
          <div className="list-flow-boolean-grid">
            <button type="button" className={`list-flow-choice ${formData.furnished ? 'is-active' : ''}`} onClick={() => updateBooleanField('furnished')} disabled={submitting}>
              Furnished: {formData.furnished ? 'Yes' : 'No'}
            </button>
            <button type="button" className={`list-flow-choice ${formData.electricityIncluded ? 'is-active' : ''}`} onClick={() => updateBooleanField('electricityIncluded')} disabled={submitting}>
              Electricity: {formData.electricityIncluded ? 'Included' : 'Not included'}
            </button>
            <button type="button" className={`list-flow-choice ${formData.waterIncluded ? 'is-active' : ''}`} onClick={() => updateBooleanField('waterIncluded')} disabled={submitting}>
              Water: {formData.waterIncluded ? 'Included' : 'Not included'}
            </button>
            <button type="button" className={`list-flow-choice ${formData.parkingAvailable ? 'is-active' : ''}`} onClick={() => updateBooleanField('parkingAvailable')} disabled={submitting}>
              Parking: {formData.parkingAvailable ? 'Available' : 'Not available'}
            </button>
            <button type="button" className={`list-flow-choice ${formData.securityAvailable ? 'is-active' : ''}`} onClick={() => updateBooleanField('securityAvailable')} disabled={submitting}>
              Security: {formData.securityAvailable ? 'Available' : 'Not available'}
            </button>
            <button type="button" className={`list-flow-choice ${formData.wifiAvailable ? 'is-active' : ''}`} onClick={() => updateBooleanField('wifiAvailable')} disabled={submitting}>
              WiFi: {formData.wifiAvailable ? 'Available' : 'Not available'}
            </button>
          </div>
        </div>

        <label className="list-flow-field">
          Gender Preference
          <select value={formData.genderPreference} onChange={(event) => updateField('genderPreference', event.target.value)} disabled={submitting}>
            {GENDER_PREFERENCES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="list-flow-field list-flow-field--full">
          House Rules
          <textarea
            value={formData.houseRules}
            onChange={(event) => updateField('houseRules', event.target.value)}
            placeholder="Quiet hours, visitor policy, utility rules, etc."
            disabled={submitting}
          />
        </label>
      </div>
    );
  };

  const renderPhotosStep = () => {
    return (
      <div className="list-flow-grid">
        <div className="list-flow-field list-flow-field--full">
          <p className="list-flow-label">Photo Requirements</p>
          <p className="list-flow-note">Upload exactly 4 required photos: Bedroom, Kitchen, Bathroom, and Outside view.</p>
          <p className="list-flow-note">AI inspection runs automatically when you submit the listing.</p>
          <div className="list-flow-photo-checks">
            {REQUIRED_PHOTO_ANGLES.map((angle) => {
              const label = photoAngleLabel(angle);
              const coverage = photoAiCoverage[angle] || { count: 0, hasPassed: false, checking: false, hasProblem: false };
              let stateClass = 'is-missing';
              let statusLabel = 'Missing';

              if (coverage.hasPassed) {
                stateClass = 'is-complete';
                statusLabel = 'AI Verified';
              } else if (coverage.checking) {
                stateClass = 'is-progress';
                statusLabel = 'Checking...';
              } else if (coverage.count > 0 && coverage.hasProblem) {
                stateClass = 'is-warning';
                statusLabel = 'Mismatch / Error';
              } else if (coverage.count > 0) {
                stateClass = 'is-warning';
                statusLabel = 'Needs AI Check';
              }

              return (
                <div key={angle} className={`list-flow-photo-check ${stateClass}`}>
                  <span>{label}</span>
                  <strong>{statusLabel}</strong>
                  <small>{coverage.count} uploaded</small>
                </div>
              );
            })}
          </div>
        </div>

        <div className="list-flow-photo-fixed-grid list-flow-field list-flow-field--full">
          {REQUIRED_PHOTO_ANGLES.map((requiredAngle) => {
            const photoIndex = formData.photos.findIndex((photo) => photo.angle === requiredAngle);
            const photo = photoIndex >= 0 ? formData.photos[photoIndex] : createEmptyPhoto(requiredAngle);
            const status = photo.inspection?.status || AI_CHECK_STATUS.UNVERIFIED;

            return (
              <article key={requiredAngle} className="list-flow-photo-fixed-card">
                <div className="list-flow-photo-fixed-header">
                  <h4>{photoAngleLabel(requiredAngle)}</h4>
                  <span>Required</span>
                </div>

                <div className={`list-flow-photo-thumb ${photo.previewUrl ? '' : 'is-empty'}`}>
                  {photo.previewUrl ? <img src={photo.previewUrl} alt={`${photoAngleLabel(requiredAngle)} view`} loading="lazy" /> : 'No image'}
                </div>

                <label className="list-flow-photo-picker">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => updatePhotoFile(photoIndex, event.target.files?.[0] || null)}
                    disabled={submitting || photoIndex < 0}
                  />
                  <span>{photo.file ? 'Replace photo' : `Upload ${photoAngleLabel(requiredAngle)}`}</span>
                </label>

                <p className="list-flow-file-name">{fileLabel(photo.file)}</p>

                <span className={`list-flow-ai-chip ${photoInspectionStatusClass(status)}`}>
                  {photoInspectionStatusLabel(status)}
                </span>
                <p className="list-flow-ai-note">{formatInspectionSummary(photo.inspection)}</p>
              </article>
            );
          })}
        </div>

        <div className="list-flow-field list-flow-field--full list-flow-inline-actions">
          <span className="list-flow-note">{validPhotos.length}/{REQUIRED_PHOTO_ANGLES.length} required photos uploaded</span>
          {photoChecksInProgress ? <span className="list-flow-note">AI inspection in progress...</span> : null}
        </div>
      </div>
    );
  };

  const renderReviewStep = () => {
    return (
      <div className="list-flow-review-wrap">
        <div className="list-flow-review">
          <div className="list-flow-review__item">
            <span>Lister Type</span>
            <strong>{formData.accountType}</strong>
          </div>
          <div className="list-flow-review__item">
            <span>Property Title</span>
            <strong>{formData.propertyTitle || 'Not set'}</strong>
          </div>
          <div className="list-flow-review__item">
            <span>Property Type / Listing Type</span>
            <strong>{formData.propertyType} / {formData.listingType}</strong>
          </div>
          <div className="list-flow-review__item">
            <span>Location</span>
            <strong>{createAddress(formData) || 'Not set'}</strong>
          </div>
          <div className="list-flow-review__item">
            <span>Owner Physical Address</span>
            <strong>{ownerPhysicalAddress(formData) || 'Not set'}</strong>
          </div>
          <div className="list-flow-review__item">
            <span>Payout Provider</span>
            <strong>{payoutProviderLabel(formData) || 'Not set'}</strong>
          </div>
          <div className="list-flow-review__item">
            <span>Monthly Rent</span>
            <strong>{formData.monthlyRent ? `${new Intl.NumberFormat('en-TZ').format(Number(formData.monthlyRent))} TZS` : 'Not set'}</strong>
          </div>
          <div className="list-flow-review__item">
            <span>Photos</span>
            <strong>{validPhotos.length} provided</strong>
          </div>
          <div className="list-flow-review__item">
            <span>AI Photo Verification</span>
            <strong>
              {REQUIRED_PHOTO_ANGLES.filter((angle) => photoAiCoverage[angle]?.hasPassed).length}/{REQUIRED_PHOTO_ANGLES.length} required angles verified
            </strong>
          </div>
          <div className="list-flow-review__item">
            <span>Identity Uploads</span>
            <strong>
              {[formData.profilePhotoFile, formData.nationalIdOrPassportFile, formData.selfiePhotoFile].filter(Boolean).length}/3 uploaded
            </strong>
          </div>
          <div className="list-flow-review__item list-flow-review__item--full">
            <span>Listing Status Flow</span>
            <strong>Draft → Submitted for Review → Admin Review → Approved (Live) / Rejected</strong>
          </div>
          <div className="list-flow-review__item list-flow-review__item--full">
            <span>Violation Consequences</span>
            <strong>Warning → Listing removal → Account suspension → Permanent ban</strong>
          </div>
        </div>

        <div className="list-flow-policies card">
          <h3>Platform Policies (Required)</h3>
          <p>All listers must agree before submission.</p>
          <div className="list-flow-policy-list">
            {POLICIES.map((policy) => (
              <label key={policy} className="list-flow-policy-item">
                <input
                  type="checkbox"
                  checked={formData.policyAccepted[policy]}
                  onChange={() => updatePolicy(policy)}
                  disabled={submitting}
                />
                <span>{policy}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderStepBody = () => {
    if (currentStep === 0) {
      return renderBasicsStep();
    }

    if (currentStep === 1) {
      return renderLocationAndPriceStep();
    }

    if (currentStep === 2) {
      return renderPhotosStep();
    }

    return renderReviewStep();
  };

  return (
    <div className="container list-property-page">
      <section className="list-flow-shell">
        <header className="list-flow-header">
          <h1>List Your Property</h1>
          <p>Complete all required steps before your listing can go live.</p>
        </header>

        <section className="list-flow-checklist">
          {checklist.map((item) => (
            <article key={item.id} className={`list-flow-check ${item.done ? 'is-done' : ''}`}>
              <span className="list-flow-check__status">{item.done ? 'Done' : 'Pending'}</span>
              <div>
                <h3>{item.label}</h3>
                <p>{item.detail}</p>
              </div>
            </article>
          ))}
        </section>

        {!isAuthenticated ? (
          <section className="card">
            <h2>Start as Property Lister</h2>
            <p>You must login with a landlord account to continue listing setup.</p>
            <div className="list-property-cta-actions">
              <Link to="/register/landlord" className="btn">
                Create Landlord Account
              </Link>
              <Link to="/login" className="btn btn--ghost">
                I already have an account
              </Link>
            </div>
          </section>
        ) : null}

        {isAuthenticated && user?.role !== 'LANDLORD' ? (
          <section className="card">
            <h2>Landlord role required</h2>
            <p>Current role is <strong>{user?.role}</strong>. Use landlord registration to continue.</p>
            <Link to="/register/landlord" className="btn">Register as Landlord</Link>
          </section>
        ) : null}

        {hasLandlordAccount ? (
          <section className="list-flow-wizard card">
            <div className="list-flow-steps">
              {STEPS.map((step, index) => {
                const stateClass = index < currentStep ? 'is-done' : index === currentStep ? 'is-active' : '';
                return (
                  <Fragment key={step.key}>
                    <button type="button" className={`list-flow-step ${stateClass}`} onClick={() => setStep(index)} disabled={submitting}>
                      <span className="list-flow-step__marker">{step.shortLabel}</span>
                      <span className="list-flow-step__label">{step.label}</span>
                    </button>
                    {index < STEPS.length - 1 ? <span className={`list-flow-step__line ${index < currentStep ? 'is-done' : ''}`} /> : null}
                  </Fragment>
                );
              })}
            </div>

            <div className="list-flow-panel">
              <header className="list-flow-panel__header">
                <h2>{currentStepMeta.title}</h2>
                <p>{currentStepMeta.subtitle}</p>
                {loadingProfile ? <p className="list-flow-note">Checking verification status...</p> : null}
                {profile ? (
                  <p className="list-flow-note">
                    Current account verification: <strong>{profile.verificationStatus}</strong>. Listing submission is allowed; admin approval is required before going live.
                  </p>
                ) : null}
                {draftRestored ? <p className="list-flow-note">Draft restored on this device. Re-upload file inputs if needed.</p> : null}
                <div className="list-flow-inline-actions">
                  <button type="button" className="btn btn--ghost btn--small" onClick={clearDraftAndReset} disabled={submitting}>
                    Clear Saved Draft
                  </button>
                </div>
              </header>

              {renderStepBody()}

              {error ? <p className="error-text">{error}</p> : null}
              {success ? <p className="success-text">{success}</p> : null}
              {!canSubmit ? <p className="list-flow-note">Submission blocked: login with a landlord account.</p> : null}

              <footer className="list-flow-panel__actions">
                <button type="button" className="btn btn--ghost" onClick={goBack} disabled={currentStep === 0 || submitting}>
                  Back
                </button>

                {currentStep < STEPS.length - 1 ? (
                  <button type="button" className="btn" onClick={goNext} disabled={submitting}>
                    Continue
                  </button>
                ) : (
                  <button type="button" className="btn" onClick={submitListing} disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit Listing'}
                  </button>
                )}
              </footer>
            </div>
          </section>
        ) : null}
      </section>
    </div>
  );
}
