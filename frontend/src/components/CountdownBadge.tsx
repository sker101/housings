import React from 'react';

export function CountdownBadge({ daysRemaining }: { daysRemaining: number }) {
  let color = 'bg-green-100 text-green-800 border-green-200';
  if (daysRemaining <= 14 && daysRemaining > 7) {
    color = 'bg-amber-100 text-amber-800 border-amber-200';
  } else if (daysRemaining <= 7) {
    color = 'bg-red-100 text-red-800 border-red-200';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${color}`}>
      Available in {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}
    </span>
  );
}
