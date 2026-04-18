import React from 'react';

export function AvailabilityPill({ status }: { status: string }) {
  const config: Record<string, { label: string; twClass: string }> = {
    occupied: { label: 'Occupied', twClass: 'bg-gray-100 text-gray-800' },
    listed_occupied: { label: 'Listed — occupied', twClass: 'bg-blue-100 text-blue-800' },
    available_soon: { label: 'Available soon', twClass: 'bg-amber-100 text-amber-800' },
    pre_booked: { label: 'Pre-booked', twClass: 'bg-purple-100 text-purple-800' },
    available: { label: 'Available now', twClass: 'bg-green-100 text-green-800' },
    unavailable: { label: 'Unavailable', twClass: 'bg-red-100 text-red-800' },
  };

  const { label, twClass } = config[status] || { label: status, twClass: 'bg-gray-100 text-gray-800' };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${twClass}`}>
      {label}
    </span>
  );
}
