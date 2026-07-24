'use client';

import { useState, useEffect } from 'react';
import { SubscriptionStatus } from '@/lib/subscriptionUtils';

export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionStatus>({
    isPremium: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        setLoading(true);
        const customerId = localStorage.getItem('polar_customer_id');

        if (!customerId) {
          setSubscription({ isPremium: false });
          return;
        }

        const response = await fetch(`/api/polar/subscription?customerId=${customerId}`);
        const data = await response.json();
        setSubscription(data);
      } catch (err) {
        console.error('Failed to check subscription:', err);
        setError(err instanceof Error ? err.message : 'Failed to check subscription');
      } finally {
        setLoading(false);
      }
    };

    checkSubscription();
  }, []);

  return { subscription, loading, error };
}
