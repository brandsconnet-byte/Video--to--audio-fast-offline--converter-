# Deployment to Vercel

## Prerequisites

- Vercel account (free tier OK): https://vercel.com
- GitHub account with repo pushed
- All environment variables ready

## Step 1: Connect GitHub to Vercel

1. Go to https://vercel.com/new
2. Click **Import Git Repository**
3. Paste your repo URL:
   ```
   https://github.com/brandsconnet-byte/Video--to--audio-fast-offline--converter-
   ```
4. Click **Import**

## Step 2: Configure Environment Variables

1. In the import dialog, click **Environment Variables**
2. Add all variables from `.env.local`:

```
GEMINI_API_KEY=your_gemini_api_key

NEXT_PUBLIC_POLAR_ORG_ID=adreco
NEXT_PUBLIC_POLAR_ACCESS_TOKEN=polar_oat_Z0sHg1txRulXXfIENFgNSJbr70EfpnXGgtWzx3fhVwn
NEXT_PUBLIC_POLAR_PRODUCT_ID=fed5e383-9b2a-412d-8416-cb4a392f48af
POLAR_WEBHOOK_SECRET=whsec_L1r204i1OABUQY1Jl0okWCBRhi9BmO91dCKxI28mwJJ
NEXT_PUBLIC_APP_URL=https://www.problemssolution.uk

NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

3. Click **Deploy**

## Step 3: Configure Custom Domain

### If using custom domain (problemssolution.uk):

1. In Vercel project settings, go to **Domains**
2. Click **Add Domain**
3. Enter: `www.problemssolution.uk`
4. Choose domain provider (Namecheap, GoDaddy, etc.)
5. Follow DNS configuration instructions

### Or use Vercel's free domain:

- Your app auto-deploys to: `your-project.vercel.app`

## Step 4: Update Polar Webhooks for Production

1. Go to Polar Dashboard: https://dashboard.polar.sh
2. Settings > Webhooks > Add Endpoint
3. Enter your production URL:
   ```
   https://www.problemssolution.uk/api/polar/webhooks
   ```
4. Copy the signing secret
5. In Vercel dashboard:
   - Project Settings > Environment Variables
   - Update `POLAR_WEBHOOK_SECRET` with the new secret
6. Re-deploy

## Step 5: Deploy

```bash
# Deploy from CLI
vercel --prod

# Or just push to main branch (auto-deploys)
git push origin main
```

## Verification Checklist

- [ ] App loads at https://www.problemssolution.uk
- [ ] Free tier conversions work (5 limit)
- [ ] Upgrade button shows pricing dialog
- [ ] Test payment redirects to Polar checkout
- [ ] Webhook endpoint returns 200 OK
- [ ] Firebase saving conversions
- [ ] Success/failed pages load correctly

## Monitoring Production

### Vercel Logs

```bash
# View all logs
vercel logs --prod

# View recent deployments
vercel ls

# Tail logs in real-time
vercel logs --tail
```

### Error Tracking

Set up error tracking (optional):

```bash
# With Sentry
npm install @sentry/nextjs
```

Then update `next.config.js` (create if doesn't exist):

```javascript
module.exports = {
  // ... rest of config
};
```

### Monitor Polar Webhooks

1. Polar Dashboard > Webhooks > Your Endpoint
2. Click **Logs** to see webhook delivery status
3. Check for failures and retry

## Auto-Deploy on Push

Vercel automatically:
- Deploys on `main` branch push
- Creates preview URLs for pull requests
- Runs `npm run build` before deployment
- Serves static assets from CDN

## Environment-Specific Setup

### Development (localhost:3000)
```
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Production (Vercel)
```
NEXT_PUBLIC_APP_URL=https://www.problemssolution.uk
```

## Troubleshooting Deployment

### Build Fails
```bash
vercel build --prod
```

Check logs for TypeScript errors or missing dependencies.

### Webhooks Not Working

1. Verify webhook URL in Polar: `https://www.problemssolution.uk/api/polar/webhooks`
2. Check POLAR_WEBHOOK_SECRET matches in Vercel env vars
3. Test with Polar's test event sender
4. View Vercel logs: `vercel logs --tail`

### Firebase Not Connecting

1. Verify all `NEXT_PUBLIC_FIREBASE_*` vars in Vercel
2. Check Firebase Firestore security rules:
   ```javascript
   rules_version = '3';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write;
       }
     }
   }
   ```
3. Restart deployment

## Performance Optimization

### Enable Caching

Vercel automatically caches:
- Static pages
- API responses (with proper headers)
- Images

### Monitor Performance

Vercel Analytics (free):
1. Project Settings > Analytics
2. Enable Core Web Vitals
3. View metrics in dashboard

## Rollback

If deployment breaks:

```bash
# View recent deployments
vercel ls

# Rollback to previous
vercel rollback
```

## Next Steps

After deployment:
1. Run through TESTING.md with production URL
2. Test real payments with Polar (or use test mode)
3. Monitor Firebase for data collection
4. Set up Vercel analytics
5. Configure error tracking (optional)
