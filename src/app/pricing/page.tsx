'use client';

import React, { useState } from 'react';
import { PricingDialog } from '@/components/PricingDialog';
import { useSubscription } from '@/hooks/useSubscription';

export default function PricingPage() {
  const [isPricingOpen, setIsPricingOpen] = useState(true);
  const { subscription } = useSubscription();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <PricingDialog
        isOpen={isPricingOpen}
        onOpenChange={setIsPricingOpen}
        currentTier={subscription.isPremium ? 'premium' : 'free'}
      />
    </div>
  );
}
