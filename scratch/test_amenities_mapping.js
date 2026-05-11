function humanize(value) { return String(value); }
function amenityEmoji(key) { return '🏠'; }

const row = { amenities: ["fan","water","parking","electricity","privateBathroom"] };

function normalizeAmenities(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return {}; }
}

const listing = { amenities: normalizeAmenities(row.amenities) };

let result = [];
if (Array.isArray(listing.amenities)) {
  result = listing.amenities.map((key) => ({ key, label: humanize(key), emoji: amenityEmoji(key), enabled: true }));
} else if (typeof listing.amenities === 'object') {
  result = Object.entries(listing.amenities).map(([key, enabled]) => ({ key, label: humanize(key), emoji: amenityEmoji(key), enabled: Boolean(enabled) }));
}

console.log(result);
