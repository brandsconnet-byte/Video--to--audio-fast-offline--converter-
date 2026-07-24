'use client';

import React from 'react';
import { X } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function CheckoutFailed() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center">
            <X className="h-8 w-8 text-red-600" />
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Payment Failed
          </h1>
          <p className="text-slate-600">
            Something went wrong with your payment. Please try again.
          </p>
        </div>

        <div className="space-y-3">
          <Link href="/pricing">
            <Button className="w-full bg-primary hover:bg-primary/90">
              Try Again
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="w-full">
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
