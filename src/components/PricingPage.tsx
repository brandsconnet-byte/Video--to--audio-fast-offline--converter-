'use client';

import React, { useState } from 'react';
import { PricingDialog } from './PricingDialog';
import { SubscriptionBadge } from './SubscriptionBadge';
import { useSubscription } from '@/hooks/useSubscription';

export function PricingPage() {
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const { subscription } = useSubscription();

  return (
    <div>
      <SubscriptionBadge
        isPremium={subscription.isPremium}
        onClick={() => setIsPricingOpen(true)}
      />
      <PricingDialog
        isOpen={isPricingOpen}
        onOpenChange={setIsPricingOpen}
        currentTier={subscription.isPremium ? 'premium' : 'free'}
      />
    </div>
  );
}
