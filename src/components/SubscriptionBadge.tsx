'use client';

import React from 'react';
import { Crown } from 'lucide-react';

interface SubscriptionBadgeProps {
  isPremium: boolean;
  onClick?: () => void;
}

export function SubscriptionBadge({ isPremium, onClick }: SubscriptionBadgeProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
        isPremium
          ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      <Crown className="h-3 w-3" />
      {isPremium ? 'Premium' : 'Free'}
    </button>
  );
}
