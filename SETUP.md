# AudioSync Studio - Setup Guide

## Quick Start

### Prerequisites
- Node.js 18+ installed
- Git
- A Polar.sh account (already configured)
- Firebase project

### Step 1: Clone & Install

```bash
# Clone the repository
git clone https://github.com/brandsconnet-byte/Video--to--audio-fast-offline--converter-.git
cd Video--to--audio-fast-offline--converter-

# Install dependencies
npm install
```

### Step 2: Configure Environment Variables

```bash
# Copy example file
cp .env.example .env.local
```

Edit `.env.local` and fill in:

```env
# Polar.sh (Already provided)
NEXT_PUBLIC_POLAR_ORG_ID=adreco
NEXT_PUBLIC_POLAR_ACCESS_TOKEN=polar_oat_Z0sHg1txRulXXfIENFgNSJbr70EfpnXGgtWzx3fhVwn
NEXT_PUBLIC_POLAR_PRODUCT_ID=fed5e383-9b2a-412d-8416-cb4a392f48af
POLAR_WEBHOOK_SECRET=whsec_L1r204i1OABUQY1Jl0okWCBRhi9BmO91dCKxI28mwJJ
NEXT_PUBLIC_APP_URL=https://www.problemssolution.uk

# Firebase - Get from Firebase Console
NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID

# Gemini API
GEMINI_API_KEY=YOUR_GEMINI_KEY
```

### Step 3: Run Locally

```bash
# Start development server
npm run dev
```

Open http://localhost:3000 in your browser.

### Step 4: Test Payment Flow

1. **Free tier (no payment):**
   - Upload videos and convert (limit: 5 conversions)
   - After 5 conversions, upgrade prompt appears

2. **Premium upgrade:**
   - Click "Upgrade" or the subscription badge
   - Choose a pricing tier
   - Use Polar test cards (see TESTING.md)
   - Should redirect to success page

### Step 5: Setup Polar Webhooks (Local Testing)

For local webhook testing, use ngrok:

```bash
# Install ngrok (if not already installed)
brew install ngrok  # macOS
# or download from https://ngrok.com/download

# In a new terminal, expose localhost:3000
ngrok http 3000
```

You'll get a URL like: `https://xxx-xxx-xxx.ngrok.io`

In Polar Dashboard:
1. Go to **Settings > Webhooks**
2. Add endpoint: `https://xxx-xxx-xxx.ngrok.io/api/polar/webhooks`
3. Select events: `order.created`, `subscription.created`, `subscription.updated`
4. Save

## File Structure

```
src/
├── app/
│   ├── api/polar/
│   │   ├── checkout/route.ts          # Checkout session creation
│   │   ├── subscription/route.ts      # Subscription verification
│   │   └── webhooks/route.ts          # Webhook handler
│   ├── checkout/
│   │   ├── success/page.tsx           # Success page
│   │   └── failed/page.tsx            # Failure page
│   ├── pricing/page.tsx               # Pricing page
│   └── page.tsx                       # Main app (updated with payment)
├── components/
│   ├── PricingDialog.tsx              # Pricing modal
│   ├── SubscriptionBadge.tsx          # Header badge
│   ├── UpgradePrompt.tsx              # Upgrade modal
│   └── ...(other components)
├── hooks/
│   └── useSubscription.ts             # Subscription check hook
└── lib/
    ├── polar.ts                       # Polar SDK init
    ├── subscriptionUtils.ts           # Sub utilities
    └── db.ts                          # Firebase + subscriptions
```

## Troubleshooting

### "Missing environment variables"
- Ensure all keys in `.env.local` are properly set
- Restart dev server after changing env vars

### "Polar SDK not found"
```bash
npm install @polar-sh/sdk
```

### "Firebase not connecting"
- Check Firebase config in `.env.local`
- Ensure Firebase project exists and is active
- Check Firestore security rules allow reads/writes

### "Webhooks not triggering"
- Verify ngrok URL is correct in Polar dashboard
- Check server logs: `npm run dev` output
- Test webhook manually in Polar dashboard

## Next Steps

→ See **POLAR_WEBHOOK_SETUP.md** for production webhook setup
→ See **DEPLOYMENT.md** for Vercel deployment
→ See **TESTING.md** for complete testing guide
