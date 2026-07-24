# Polar.sh Webhook Configuration

## Production Webhook Setup

### Step 1: Get Your Webhook Endpoint URL

Your production webhook URL will be:
```
https://www.problemssolution.uk/api/polar/webhooks
```

### Step 2: Configure in Polar Dashboard

1. Log in to your Polar account: https://dashboard.polar.sh
2. Navigate to **Settings > Webhooks**
3. Click **Add Endpoint**
4. Enter URL:
   ```
   https://www.problemssolution.uk/api/polar/webhooks
   ```
5. Select Events to Subscribe To:
   - ✅ `checkout.created`
   - ✅ `order.created`
   - ✅ `subscription.created`
   - ✅ `subscription.updated`
   - ✅ `subscription.canceled`
6. Click **Save**

### Step 3: Get Webhook Secret

1. In **Settings > Webhooks**, find your endpoint
2. Click the three dots menu
3. Copy the **Signing Secret** (starts with `whsec_`)
4. Add to your `.env.local`:
   ```env
   POLAR_WEBHOOK_SECRET=whsec_L1r204i1OABUQY1Jl0okWCBRhi9BmO91dCKxI28mwJJ
   ```

### Step 4: Test Webhook (Polar Dashboard)

1. Go to your webhook endpoint in dashboard
2. Click **Send Test Event**
3. Choose an event type (e.g., `order.created`)
4. Check your server logs for webhook received message
5. Verify server responded with `200 OK`

## Webhook Events & Actions

### `checkout.created`
- User initiates payment
- Log: Order created

### `order.created`
- Payment processed successfully
- **Action:** Mark as completed in Firebase

### `subscription.created`
- Monthly/yearly subscription starts
- **Action:** 
  - Create user subscription in Firebase
  - Set tier to 'premium' or 'pro'
  - Set expiresAt date
  - Reset conversionsUsed to 0

### `subscription.updated`
- Subscription modified (renewal, upgrade, downgrade)
- **Action:** Update user subscription record

### `subscription.canceled`
- Subscription canceled
- **Action:** Set status to 'canceled' in Firebase

## Firebase Integration (In Webhook Handler)

The webhook handler updates Firebase:

```typescript
// When subscription.created event received
await updateUserSubscription(polarCustomerId, {
  tier: 'premium',
  status: 'active',
  polarSubscriptionId: event.data.id,
  expiresAt: new Date(event.data.endsAt).getTime(),
  conversionsUsed: 0,
  conversionsLimit: Infinity,
});
```

## Monitor Webhooks

### In Production

```bash
# View logs on Vercel
vercel logs --tail

# Filter for webhook errors
vercel logs --tail | grep webhook
```

### Webhook Signature Verification

All webhooks are signed with HMAC-SHA256:

```
Signature = HMAC-SHA256(timestamp.body, POLAR_WEBHOOK_SECRET)
```

Our handler automatically verifies this in `/src/app/api/polar/webhooks/route.ts`

## Troubleshooting Webhooks

### "Webhook failing" in Polar Dashboard

1. Check endpoint responds with `200 OK`
2. Verify `POLAR_WEBHOOK_SECRET` is correct
3. Check server logs for errors
4. Test with Polar's test event sender

### "Signature verification failed"

- Ensure `POLAR_WEBHOOK_SECRET` exactly matches Polar dashboard
- No trailing/leading spaces
- Restart server after updating

### "Firebase not updating"

- Check Firebase security rules allow writes
- Verify Firestore `userSubscriptions` collection exists
- Check browser console for errors
- Monitor Cloud Functions logs (if using)

## Reference

- Polar Webhooks Docs: https://docs.polar.sh/webhooks
- Webhook Events: https://docs.polar.sh/webhooks/events
