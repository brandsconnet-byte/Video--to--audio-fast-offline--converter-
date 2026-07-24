'use client';

import React, { useState, useEffect } from 'react';
import { UpgradePrompt } from './UpgradePrompt';
import { useSubscription } from '@/hooks/useSubscription';

interface ConversionLimiterProps {
  children: React.ReactNode;
  conversionsUsed: number;
}

export function ConversionLimiter({
  children,
  conversionsUsed,
}: ConversionLimiterProps) {
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { subscription } = useSubscription();

  const FREE_TIER_LIMIT = 5;
  const isLimitReached =
    !subscription.isPremium && conversionsUsed >= FREE_TIER_LIMIT;

  useEffect(() => {
    if (isLimitReached) {
      setShowUpgrade(true);
    }
  }, [isLimitReached]);

  return (
    <>
      {showUpgrade && (
        <UpgradePrompt
          onUpgradeClick={() => window.location.href = '/pricing'}
          message={`You've used ${conversionsUsed}/${FREE_TIER_LIMIT} free conversions. Upgrade to Premium for unlimited conversions!`}
        />
      )}
      {children}
    </>
  );
}
