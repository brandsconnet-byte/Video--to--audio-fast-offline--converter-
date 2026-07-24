import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-polar-signature') || '';
    const timestamp = request.headers.get('x-polar-timestamp') || '';
    const body = await request.text();

    // Verify webhook signature
    const secret = process.env.POLAR_WEBHOOK_SECRET || '';
    const signedContent = `${timestamp}.${body}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedContent)
      .digest('hex');

    if (signature !== expectedSignature) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const event = JSON.parse(body);

    // Handle different webhook events
    switch (event.type) {
      case 'checkout.created':
        console.log('Checkout created:', event.data);
        break;
      case 'order.created':
        console.log('Order created:', event.data);
        // TODO: Update user subscription in Firebase
        break;
      case 'subscription.created':
        console.log('Subscription created:', event.data);
        // TODO: Update user subscription in Firebase
        break;
      case 'subscription.updated':
        console.log('Subscription updated:', event.data);
        // TODO: Update user subscription in Firebase
        break;
      default:
        console.log('Unknown event type:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
