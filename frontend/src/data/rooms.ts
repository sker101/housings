export const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1616594039964-3c8b5f879d34?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1630699375898-2f472b58f3fd?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1523217582562-09d0def993a6?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1493666438817-866a91353ca9?auto=format&fit=crop&w=900&q=80'
];

export interface Room {
  id: string;
  title: string;
  location: string;
  distanceLabel: string;
  rentAmount: number;
  currency: string;
  roomType: string;
  description: string;
  imageUrl: string;
  verified: boolean;
  occupancyType?: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  listingStatus?: string;
  photos?: Photo[];
}

export interface Photo {
  id: string;
  angle: string;
  url: string;
}

export const DUMMY_ROOMS: Room[] = [
  {
    id: 'demo-1',
    title: 'Cozy Studio Near UDSM Main Gate',
    location: 'Ubungo',
    distanceLabel: '1.2 km from campus',
    rentAmount: 320000,
    currency: 'TZS',
    roomType: 'Single',
    description:
      'Bright and quiet single studio with desk, wardrobe, and reliable water supply. Ideal for focused study and quick bus access to UDSM.',
    imageUrl: FALLBACK_IMAGES[0],
    verified: true
  },
  {
    id: 'demo-2',
    title: 'Twin Shared Room for Female Students',
    location: 'Sinza',
    distanceLabel: '2.5 km from campus',
    rentAmount: 180000,
    currency: 'TZS',
    roomType: 'Shared',
    description:
      'Affordable twin-sharing setup with secure compound and shared kitchen. Popular choice for first-year students.',
    imageUrl: FALLBACK_IMAGES[1],
    verified: true
  },
  {
    id: 'demo-3',
    title: 'Modern Single Room with Wi-Fi',
    location: 'Mlimani City',
    distanceLabel: '0.9 km from campus',
    rentAmount: 380000,
    currency: 'TZS',
    roomType: 'Single',
    description:
      'Modern single room close to campus with fast internet, tiled bathroom, and backup water storage.',
    imageUrl: FALLBACK_IMAGES[2],
    verified: true
  },
  {
    id: 'demo-4',
    title: 'Budget Friendly Shared Apartment',
    location: 'Mwenge',
    distanceLabel: '3.1 km from campus',
    rentAmount: 160000,
    currency: 'TZS',
    roomType: 'Shared',
    description:
      'Practical shared apartment option with easy daladala routes and nearby food spots.',
    imageUrl: FALLBACK_IMAGES[3],
    verified: true
  },
  {
    id: 'demo-5',
    title: 'Quiet Ensuite Room for Study',
    location: 'Makongo',
    distanceLabel: '2.0 km from campus',
    rentAmount: 290000,
    currency: 'TZS',
    roomType: 'Single',
    description:
      'Ensuite room in a calm neighborhood with good lighting and dedicated reading space.',
    imageUrl: FALLBACK_IMAGES[4],
    verified: true
  },
  {
    id: 'demo-6',
    title: 'Furnished Mini Apartment',
    location: 'Mikocheni',
    distanceLabel: '4.2 km from campus',
    rentAmount: 450000,
    currency: 'TZS',
    roomType: 'Self-contained',
    description:
      'Furnished mini apartment with private kitchenette and secure gate, ideal for students who prefer privacy.',
    imageUrl: FALLBACK_IMAGES[5],
    verified: true
  }
];

export function mapApiListing(listing: any, index: number = 0): Room {
  const occupancyType = listing.occupancyType || 'SINGLE';
  const photos: Photo[] = Array.isArray(listing.photos)
    ? listing.photos
      .filter((photo: any) => Boolean(photo?.url))
      .map((photo: any, photoIndex: number) => ({
        id: photo.id || `${listing.id}-photo-${photoIndex}`,
        angle: photo.angle || 'OTHER',
        url: photo.url
      }))
    : [];
  const primaryPhotoUrl = photos[0]?.url;

  return {
    id: listing.id,
    title: listing.title,
    location: listing.address,
    distanceLabel: 'Verified near UDSM',
    rentAmount: Number(listing.rentAmount),
    currency: listing.currency || 'TZS',
    roomType: occupancyType.replace('_', ' '),
    occupancyType,
    bedrooms: Number.isFinite(Number(listing.bedrooms)) ? Number(listing.bedrooms) : null,
    bathrooms: Number.isFinite(Number(listing.bathrooms)) ? Number(listing.bathrooms) : null,
    listingStatus: listing.listingStatus || '',
    description: listing.description,
    imageUrl: primaryPhotoUrl || listing.imageUrl || FALLBACK_IMAGES[index % FALLBACK_IMAGES.length],
    photos,
    verified: listing.verified
  };
}

export function findDummyRoomById(roomId: string): Room | null {
  return DUMMY_ROOMS.find((room) => room.id === roomId) || null;
}
