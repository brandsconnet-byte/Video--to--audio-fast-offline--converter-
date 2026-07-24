# Complete Testing Guide

## Local Testing Setup

### Prerequisites
- `npm run dev` running on http://localhost:3000
- ngrok running (for webhooks)
- Polar test mode enabled

## Test Cases

### 1. Free Tier Functionality

**Test:** Upload and convert 5 videos (free limit)

```
✓ Upload video 1 → Convert → Download
✓ Upload video 2 → Convert → Download
✓ Upload video 3 → Convert → Download
✓ Upload video 4 → Convert → Download
✓ Upload video 5 → Convert → Download
✓ Try upload video 6 → "Upgrade" prompt appears
```

**Expected:**
- First 5 conversions work
- 6th upload shows upgrade modal
- History shows all 5 conversions
- Subscription badge shows "Free"

### 2. Pricing Dialog

**Test:** Click subscription badge or "Upgrade" button

```
✓ Pricing dialog opens
✓ 3 tiers displayed (Free, Premium, Pro)
✓ "Premium" marked as "MOST POPULAR"
✓ Features listed for each tier
✓ Current plan shows "Current Plan" button (disabled)
```

### 3. Checkout Flow

**Test:** Click "Upgrade" on Premium tier

```
✓ "Upgrade" button disabled (loading)
✓ Redirects to Polar checkout
✓ Can view order summary
✓ Can enter payment details
```

### 4. Test Payment Cards

Use these Polar test cards:

| Card | Number | Expiry | CVC | Status |
|------|--------|--------|-----|--------|
| Success | 4242 4242 4242 4242 | 12/25 | 123 | ✅ Completes |
| Decline | 4000 0000 0000 0002 | 12/25 | 123 | ❌ Declines |
| Requires Auth | 4000 0025 0000 3155 | 12/25 | 123 | 🔐 3D Secure |

**Test:**
1. Success card → Payment completes → Redirects to success page
2. Decline card → Shows error → Can retry
3. Back button → Returns to pricing

### 5. Success Page

**Test:** After successful payment

```
✓ Success page shows confirmation
✓ Shows activated features
✓ "Start Converting" button works
✓ Redirects to home page
```

### 6. Webhook Testing

**Test:** Verify webhook events trigger

#### Local Testing with ngrok:

```bash
# Terminal 1: Dev server
npm run dev

# Terminal 2: Expose to internet
ngrok http 3000
# Note the URL: https://xxx-xxx-xxx.ngrok.io

# Terminal 3: View logs
tail -f /path/to/app/.logs
```

#### Configure Polar Webhooks:

1. Polar Dashboard > Settings > Webhooks
2. Add Endpoint: `https://xxx-xxx-xxx.ngrok.io/api/polar/webhooks`
3. Copy signing secret to `.env.local`
4. Restart dev server

#### Test Webhook:

1. Polar Dashboard > Your Endpoint > Send Test Event
2. Choose `order.created`
3. Check dev server logs for:
   ```
   Webhook received: order.created
   Updated user subscription: ✅
   ```

### 7. Firebase Integration

**Test:** Data persists in Firestore

1. Open Firebase Console
2. Go to Firestore Database
3. Convert a file (as free user)
4. Check `conversions` collection:
   ```
   conversions/
     conv-{timestamp}-{id}/
       - name: "output.mp3"
       - originalName: "video.mp4"
       - size: 2048000
       - date: 1690286400000
   ```
5. After premium purchase, check `userSubscriptions`:
   ```
   userSubscriptions/
     {customerId}/
       - tier: "premium"
       - status: "active"
       - conversionsUsed: 0
       - conversionsLimit: Infinity
       - polarSubscriptionId: "sub_123"
       - expiresAt: 1693000000000
   ```

### 8. API Routes

**Test:** API endpoints

#### Checkout Route
```bash
curl -X POST http://localhost:3000/api/polar/checkout \
  -H "Content-Type: application/json" \
  -d '{"productId": "fed5e383-9b2a-412d-8416-cb4a392f48af"}'

# Expected response:
# {"url": "https://checkout.polar.sh/..."}
```

#### Subscription Route
```bash
curl http://localhost:3000/api/polar/subscription?customerId=cus_123

# Expected response:
# {"isPremium": true, "expiresAt": 1693000000000, "customerId": "cus_123"}
```

### 9. Conversion Limiting

**Test:** Feature gating works

```
✓ Free user: Can upload, limited to 5/month
✓ Premium user: Can upload, unlimited
✓ After upgrade: Limit removed immediately
✓ History persists across sessions
```

### 10. Batch Operations

**Test:** Multiple files

```
✓ Upload 3 videos at once
✓ Start conversion on each
✓ "Save All to Device" downloads all
✓ "Clear History" removes all conversions
```

### 11. Error Handling

**Test:** Error scenarios

```
✓ Missing environment variables → Error message
✓ Invalid Polar product ID → Checkout fails gracefully
✓ Firebase offline → "Offline" indicator shows
✓ Network error during conversion → Retry available
```

### 12. Responsive Design

**Test:** Mobile & tablet

```
✓ Header stacks properly
✓ Pricing tiers stack vertically
✓ Upload zone responsive
✓ Buttons touch-friendly (48px minimum)
✓ No horizontal scroll
```

## Production Testing

### Before Going Live:

1. **Full Payment Flow**
   ```bash
   # On production URL
   # 1. Upload free conversions
   # 2. Hit limit → Upgrade modal
   # 3. Click Upgrade
   # 4. Use test Polar card
   # 5. Verify webhook processed
   # 6. Check Firebase updated
   ```

2. **Webhook Verification**
   ```bash
   # Vercel logs
   vercel logs --tail
   
   # Should see:
   # "Webhook received: subscription.created"
   # "User upgraded to premium"
   ```

3. **Firebase Permissions**
   - Test read/write from browser
   - Verify security rules allow it
   - Check quota limits

4. **Performance**
   ```bash
   # Check Core Web Vitals
   # Vercel > Analytics
   # Should see < 2.5s LCP, < 100ms FID, < 0.1 CLS
   ```

## Test Coverage Checklist

- [ ] Free tier: 5 conversions limit
- [ ] Pricing dialog displays correctly
- [ ] Checkout redirects to Polar
- [ ] Test cards work (success & decline)
- [ ] Success page shows after payment
- [ ] Failed page shows on decline
- [ ] Webhooks update Firebase
- [ ] Premium users get unlimited conversions
- [ ] Data persists in Firestore
- [ ] Mobile responsive
- [ ] API routes return correct responses
- [ ] Error handling graceful
- [ ] Batch operations work
- [ ] Download functionality works
- [ ] History clears properly

## Common Issues & Fixes

### "Webhook signature invalid"
- Check `POLAR_WEBHOOK_SECRET` matches Polar dashboard
- Verify no trailing spaces
- Restart dev server

### "Checkout returns 400"
- Verify product ID is correct
- Check Polar API key is valid
- Ensure environment variables loaded

### "Firebase not found"
- Run `npm install firebase`
- Check `.env.local` has all Firebase vars
- Verify Firestore rules allow access

### "Conversion not saving"
- Check browser DevTools Console
- Verify Firebase collection exists
- Check network tab for API errors

## Load Testing (Optional)

Test with many concurrent users:

```bash
npm install -g artillery

# Create load-test.yml
# Then run:
arillery run load-test.yml
```

## Next Steps

✅ Complete all tests above
✅ Deploy to production (see DEPLOYMENT.md)
✅ Run production tests
✅ Monitor in Vercel dashboard
✅ Set up alerts for errors
