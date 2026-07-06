export const DAR_DISTRICTS = [
    { value: 'Ilala', label: 'Ilala' },
    { value: 'Kinondoni', label: 'Kinondoni' },
    { value: 'Temeke', label: 'Temeke' },
    { value: 'Ubungo', label: 'Ubungo' },
    { value: 'Kigamboni', label: 'Kigamboni' }
];

export const DAR_WARDS = {
    Ilala: ['Upanga', 'Kisutu', 'Kariakoo', 'Ilala', 'Tabata', 'Segerea', 'Kipawa', 'Ukonga'],
    Kinondoni: [
        'Oyster Bay',
        'Masaki',
        'Msasani',
        'Mikocheni',
        'Kijitonyama',
        'Sinza',
        'Mwenge',
        'Makongo',
        'Kawe',
        'Mbezi Beach',
        'Tegeta'
    ],
    Temeke: ['Kurasini', 'Changombe', 'Temeke', 'Mbagala', 'Kigamboni'],
    Ubungo: [
        'Ubungo',
        'Mabibo',
        'Kibangu',
        'Riverside',
        'Kimara',
        'Mbezi',
        'Goba',
        'Makurumla'
    ],
    Kigamboni: ['Kigamboni', 'Mjimwema', 'Kibada', 'Somangila']
};

export const ROOM_TYPES = [
    { value: 'single', label: 'Single Room' },
    { value: 'double', label: 'Double Room' },
    { value: 'self_contained', label: 'Self-Contained' },
    { value: 'shared', label: 'Shared Room' },
    { value: 'bedsitter', label: 'Bedsitter' }
];

export const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest' },
    { value: 'featured', label: 'Featured' },
    { value: 'price_asc', label: 'Price low to high' },
    { value: 'price_desc', label: 'Price high to low' }
];

export const GENDER_PREFERENCES = [
    { value: 'any', label: 'Any' },
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' }
];

export const UNIVERSITIES = [
    { value: 'UDSM', label: 'UDSM' },
    { value: 'ARDHI', label: 'ARDHI' },
    { value: 'MUHAS', label: 'MUHAS' },
    { value: 'IFM', label: 'IFM' }
];

export const AMENITIES_LIST = [
    { key: 'wifi',            label: 'WiFi / Internet',        emoji: '📶' },
    { key: 'water',           label: 'Running Water',           emoji: '💧' },
    { key: 'electricity',     label: 'Electricity (TANESCO)',   emoji: '⚡' },
    { key: 'generator',       label: 'Backup Generator',        emoji: '🔋' },
    { key: 'security',        label: 'Security Guard',          emoji: '🛡️' },
    { key: 'parking',         label: 'Parking Space',           emoji: '🚗' },
    { key: 'furnished',       label: 'Furnished Room',          emoji: '🛋️' },
    { key: 'kitchen',         label: 'Shared Kitchen',          emoji: '🍳' },
    { key: 'privateBathroom', label: 'Private Bathroom',        emoji: '🚿' },
    { key: 'sharedBathroom',  label: 'Shared Bathroom',         emoji: '🛁' },
    { key: 'laundry',         label: 'Laundry Area',            emoji: '🧺' },
    { key: 'tv',              label: 'TV / Cable',              emoji: '📺' },
    { key: 'ac',              label: 'Air Conditioning',        emoji: '❄️' },
    { key: 'fan',             label: 'Ceiling Fan',             emoji: '🌀' },
    { key: 'balcony',         label: 'Balcony / Veranda',       emoji: '🌤️' },
    { key: 'cctv',            label: 'CCTV Cameras',            emoji: '📷' },
    { key: 'cleaningService', label: 'Cleaning Service',        emoji: '🧹' },
    { key: 'rooftopAccess',   label: 'Rooftop Access',          emoji: '🏙️' }
];

export const PROPERTY_TYPES = [
    { value: 'apartment_building', label: 'Apartment Building' },
    { value: 'standalone_house',   label: 'Standalone House' },
    { value: 'hostel',             label: 'Hostel / Boarding' },
    { value: 'compound',           label: 'Compound / Nyumba ya Pango' },
    { value: 'other',              label: 'Other' }
];

export const FLOOR_OPTIONS = [
    { value: 'ground', label: 'Ground Floor' },
    { value: '1st',    label: '1st Floor' },
    { value: '2nd',    label: '2nd Floor' },
    { value: '3rd',    label: '3rd Floor' },
    { value: '4th+',   label: '4th Floor or Higher' },
    { value: 'na',     label: 'N/A (No Floors)' }
];

export const PAYMENT_SCHEDULES = [
    { value: 'monthly',    label: 'Monthly' },
    { value: 'quarterly',  label: 'Quarterly (Every 3 months)' },
    { value: 'annually',   label: 'Annually (Once a year)' }
];
