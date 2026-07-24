'use client';

import React, { useState } from 'react';
import { CreditCard, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PricingTier {
  id: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  productId: string;
  popular?: boolean;
}

const PRICING_TIERS: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    description: 'Perfect for trying out',
    features: [
      '5 conversions/month',
      'MP3 & WAV support',
      'Local processing',
      'Basic quality',
    ],
    productId: '',
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$9.99',
    description: 'For regular users',
    features: [
      'Unlimited conversions',
      'MP3, WAV & FLAC',
      'AI audio enhancement',
      'Priority processing',
      'Batch downloads',
    ],
    productId: process.env.NEXT_PUBLIC_POLAR_PRODUCT_ID || '',
    popular: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$29.99',
    description: 'For professionals',
    features: [
      'Everything in Premium',
      'Advanced audio effects',
      'API access',
      'Email support',
      '1TB storage',
    ],
    productId: 'pro_product_id', // Replace with actual Pro product ID
  },
];

interface PricingDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentTier?: string;
}

export function PricingDialog({
  isOpen,
  onOpenChange,
  currentTier = 'free',
}: PricingDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckout = async (productId: string) => {
    if (!productId) return;
    setIsLoading(true);

    try {
      const response = await fetch('/api/polar/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Checkout failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-3xl">Choose Your Plan</DialogTitle>
          <DialogDescription>
            Upgrade to unlock unlimited conversions and premium features
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-8">
          {PRICING_TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`relative rounded-2xl p-6 border transition-all ${
                tier.popular
                  ? 'border-primary bg-primary/5 shadow-lg scale-105'
                  : 'border-slate-200 bg-white'
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">
                    MOST POPULAR
                  </span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {tier.name}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {tier.description}
                  </p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-slate-900">
                    {tier.price}
                  </span>
                  {tier.id !== 'free' && (
                    <span className="text-sm text-slate-500">/month</span>
                  )}
                </div>

                <ul className="space-y-3">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-slate-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() =>
                    tier.productId && handleCheckout(tier.productId)
                  }
                  disabled={
                    isLoading ||
                    currentTier === tier.id ||
                    !tier.productId
                  }
                  className={`w-full ${
                    tier.popular
                      ? 'bg-primary hover:bg-primary/90'
                      : 'bg-slate-200 hover:bg-slate-300 text-slate-900'
                  }`}
                >
                  {currentTier === tier.id ? (
                    'Current Plan'
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Upgrade
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
