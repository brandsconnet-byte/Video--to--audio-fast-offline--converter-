'use client';

import React, { useEffect, useState } from 'react';
import { CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UpgradePromptProps {
  onUpgradeClick: () => void;
  message?: string;
}

export function UpgradePrompt({
  onUpgradeClick,
  message = 'Upgrade to Premium to continue converting',
}: UpgradePromptProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 rounded-lg">
      <div className="bg-white rounded-2xl p-8 max-w-sm shadow-xl">
        <div className="flex justify-center mb-4">
          <div className="h-12 w-12 bg-amber-100 rounded-full flex items-center justify-center">
            <CreditCard className="h-6 w-6 text-amber-600" />
          </div>
        </div>

        <h3 className="text-xl font-bold text-slate-900 text-center mb-2">
          Upgrade to Premium
        </h3>

        <p className="text-slate-600 text-center text-sm mb-6">{message}</p>

        <div className="space-y-3">
          <Button
            onClick={onUpgradeClick}
            className="w-full bg-primary hover:bg-primary/90"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Upgrade Now
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsVisible(false)}
            className="w-full"
          >
            Maybe Later
          </Button>
        </div>
      </div>
    </div>
  );
}
