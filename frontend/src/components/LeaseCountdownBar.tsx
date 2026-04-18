import React from 'react';

export function LeaseCountdownBar({ leaseEndDate, leaseStartDate }: { leaseEndDate: string | Date, leaseStartDate?: string | Date }) {
  const end = new Date(leaseEndDate);
  const start = leaseStartDate ? new Date(leaseStartDate) : new Date(end.getTime() - 6 * 30 * 24 * 60 * 60 * 1000); // default back 6 months
  const now = new Date();

  const total = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();
  const remaining = end.getTime() - now.getTime();
  
  let percentage = Math.max(0, Math.min(100, (elapsed / total) * 100));
  const daysRemaining = Math.max(0, Math.ceil(remaining / (1000 * 60 * 60 * 24)));

  let color = 'bg-jade';
  if (daysRemaining <= 14 && daysRemaining > 7) {
    color = 'bg-amber-500';
  } else if (daysRemaining <= 7) {
    color = 'bg-red-500';
  }

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{daysRemaining} days remaining</span>
        <span>{end.toLocaleDateString('sw-TZ')}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div className={`h-2.5 rounded-full ${color}`} style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  );
}
