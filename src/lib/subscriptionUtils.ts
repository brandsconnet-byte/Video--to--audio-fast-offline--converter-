import polar from '@/lib/polar';

export interface SubscriptionStatus {
  isPremium: boolean;
  expiresAt?: number;
  customerId?: string;
  subscriptionId?: string;
}

export async function getCustomerSubscription(
  customerId: string
): Promise<SubscriptionStatus> {
  try {
    const subscription = await polar.subscriptions.list({
      customerId,
      status: 'active',
    });

    if (subscription.result && subscription.result.length > 0) {
      const sub = subscription.result[0];
      return {
        isPremium: true,
        expiresAt: sub.endsAt ? new Date(sub.endsAt).getTime() : undefined,
        customerId,
        subscriptionId: sub.id,
      };
    }

    return { isPremium: false };
  } catch (error) {
    console.error('Failed to get subscription:', error);
    return { isPremium: false };
  }
}

export async function verifySubscription(orderId: string): Promise<boolean> {
  try {
    const order = await polar.orders.get(orderId);
    return order.status === 'completed' || order.status === 'confirmed';
  } catch (error) {
    console.error('Failed to verify subscription:', error);
    return false;
  }
}
