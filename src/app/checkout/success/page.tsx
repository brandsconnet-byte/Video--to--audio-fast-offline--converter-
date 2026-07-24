'use client';

import React from 'react';
import { Check } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function CheckoutSuccess() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
            <Check className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Payment Successful!
          </h1>
          <p className="text-slate-600">
            Your upgrade to Premium is complete. Start enjoying unlimited conversions!
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left">
          <p className="text-sm text-green-800">
            <strong>✓</strong> Unlimited conversions
          </p>
          <p className="text-sm text-green-800 mt-2">
            <strong>✓</strong> AI audio enhancement
          </p>
          <p className="text-sm text-green-800 mt-2">
            <strong>✓</strong> Priority processing
          </p>
        </div>

        <Link href="/">
          <Button className="w-full bg-primary hover:bg-primary/90">
            Start Converting
          </Button>
        </Link>
      </div>
    </div>
  );
}
