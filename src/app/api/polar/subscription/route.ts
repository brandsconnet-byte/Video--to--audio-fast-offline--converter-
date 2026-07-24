import { NextRequest, NextResponse } from 'next/server';
import { getCustomerSubscription } from '@/lib/subscriptionUtils';

export async function GET(request: NextRequest) {
  try {
    const customerId = request.nextUrl.searchParams.get('customerId');

    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    const subscription = await getCustomerSubscription(customerId);
    return NextResponse.json(subscription);
  } catch (error) {
    console.error('Subscription check error:', error);
    return NextResponse.json(
      { error: 'Failed to check subscription' },
      { status: 500 }
    );
  }
}
