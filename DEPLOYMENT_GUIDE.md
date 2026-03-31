# Deployment Guide - CampusStay TZ

**Status**: ✅ Ready for Production Deployment  
**Commit**: `e60fde4` on main branch  
**Date**: March 31, 2026

---

## 1. Pre-Deployment Checklist

### Code Quality
- [x] TypeScript compilation: **PASSING** ✅
- [x] All database migrations: **COMMITTED** ✅
- [x] Frontend build: **SUCCESSFUL** (1.1MB gzipped JS) ✅
- [x] Git commits: **PUSHED TO GITHUB** ✅
- [x] Documentation: **COMPLETE** ✅

### Frontend Verification
```bash
cd frontend
npm run build  # ✅ Successful in 2.52s
```

### Database Status
- **Migration Files**: All in `supabase/migrations/`
- **Listing Overhaul**: `20260401100000_listing_overhaul.sql` ✅
- **Hide Occupied**: `20260401000000_hide_occupied_listings.sql` ✅
- **Reviews & Bookings**: `20260228003000_reviews_bookings_payments.sql` ✅

### Git Status
```bash
git log --oneline main | head -1
# e60fde4 feat: complete listing overhaul with new schema, 7-step form, and documentation
```

---

## 2. Vercel Deployment

### Option A: Auto-Deploy from GitHub (Recommended)

1. **Connect Repository**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import GitHub repository: `sker101/housings`
   - Select `main` branch

2. **Configure Build Settings**
   - Root Directory: `frontend/`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. **Add Environment Variables**
   - `VITE_SUPABASE_PROJECT_REF`: `iavflytaqfdwhmshocvm`
   - `VITE_SUPABASE_URL`: `https://iavflytaqfdwhmshocvm.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: (Get from Supabase dashboard → Settings → API)

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (~3-5 min)
   - Get production URL from Vercel dashboard

### Option B: Manual Deployment via CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from project root
cd frontend
vercel --prod

# Follow prompts:
# - Link to existing project? Yes (if exists) or create new
# - Deploy to production? Yes
# - Environment variables added? Save for next deploy
```

---

## 3. Database Migration (Production)

**IMPORTANT**: Must be done before traffic hits new code

### For Supabase Hosted Production

```bash
# Method 1: Via Supabase CLI (Recommended)
supabase link --project-ref=<your-project-ref>
supabase db push  # Applies pending migrations
supabase db remote commit  # Records migration state

# Method 2: Via Supabase Dashboard
# 1. Go to SQL Editor
# 2. Copy content of migrations/20260401100000_listing_overhaul.sql
# 3. Copy content of migrations/20260401000000_hide_occupied_listings.sql
# 4. Paste and execute each
```

### Verification

```sql
-- Check new columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'listings' 
  AND column_name IN ('security_deposit', 'floor', 'furnished', 'property_type');

-- Should return 4 rows with types:
-- security_deposit: integer
-- floor: text
-- furnished: boolean
-- property_type: text

-- Check photo columns
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'listing_photos' 
  AND column_name IN ('position', 'caption', 'is_cover');

-- Should return 3 rows
```

---

## 4. Post-Deployment Verification

### Frontend Tests

```bash
# 1. Check deployed URL loads
curl -I https://your-vercel-url.vercel.app

# 2. Test home page loads
# - Should see CampusStay logo
# - Should see search bar
# - Should see featured listings

# 3. Test login flow
# - Click "Sign In"
# - Use test credentials
# - Should redirect to dashboard

# 4. Test list property flow (landlord)
# - As lister, click "List Property"
# - Go through 7-step form
# - Submit listing
# - Should complete without errors
```

### Backend Tests

```bash
# 1. Listings table query
curl -X GET 'https://your-supabase-url/rest/v1/listings?limit=1' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'apikey: YOUR_ANON_KEY'

# Response should include new fields:
# security_deposit, floor, furnished, property_type

# 2. Test RLS policy (hide occupied listings)
# - As student A, can see available listings
# - As student B, cannot see listings where student A has booking
# - As landlord, can see own listings even if occupied
```

### Error Monitoring

1. **Vercel Analytics**
   - Dashboard → Monitoring
   - Watch for 4xx/5xx errors
   - Check Core Web Vitals

2. **Supabase Logs**
   - Dashboard → Logs → API
   - Check for authentication errors
   - Monitor query performance

3. **Browser Console**
   - Production URL
   - Open DevTools Console (F12)
   - Should be clean, no errors

---

## 5. Rollback Plan

If issues occur post-deployment:

### Quick Rollback

```bash
# Revert to previous commit on Vercel
# 1. Go to Vercel dashboard
# 2. Click on your project
# 3. Go to Deployments tab
# 4. Find previous successful deployment
# 5. Click "..." → Redeploy

# Or from CLI
vercel rollback
```

### Database Rollback

If migration caused issues:

```sql
-- This would require running reverse migrations
-- For now, contact Supabase support for restore from backup
```

---

## 6. Environment Variables Summary

### Vercel Environment Variables

| Variable | Value | Source |
|----------|-------|--------|
| `VITE_SUPABASE_PROJECT_REF` | `iavflytaqfdwhmshocvm` | Supabase dashboard |
| `VITE_SUPABASE_URL` | `https://iavflytaqfdwhmshocvm.supabase.co` | Supabase dashboard |
| `VITE_SUPABASE_ANON_KEY` | See Supabase dashboard | Settings → API → anon key |

### How to Get Supabase Keys

1. Go to [supabase.com](https://supabase.com)
2. Select your project
3. Go to Settings → API
4. Copy:
   - Project URL → `VITE_SUPABASE_URL`
   - `anon` key → `VITE_SUPABASE_ANON_KEY`

---

## 7. Domain & DNS Setup

### Custom Domain (Optional)

1. **Add Domain to Vercel**
   - Vercel dashboard → Project Settings → Domains
   - Add your custom domain
   - Get DNS records from Vercel

2. **Update DNS at Registrar**
   - Go to your domain registrar (GoDaddy, Namecheap, etc.)
   - Add CNAME record pointing to Vercel
   - Wait 24-48 hours for propagation

3. **SSL Certificate**
   - Automatic with Vercel (Let's Encrypt)
   - Takes a few minutes after DNS setup

---

## 8. Monitoring & Maintenance

### Daily Checks

```bash
# Check website is up
curl -I https://campusstay.example.com

# Check Supabase API is responding
# Log in → check dashboard loads
# Try creating a new listing → check backend responds
```

### Weekly Tasks

- [ ] Review error logs in Vercel
- [ ] Check Supabase query performance metrics
- [ ] Verify backups are running (Supabase auto-backs up)
- [ ] Monitor user feedback/issues

### Monthly Tasks

- [ ] Analyze Core Web Vitals trends
- [ ] Review database storage usage
- [ ] Update dependencies (`npm audit fix`)
- [ ] Test disaster recovery plan

---

## 9. Scaling Considerations

### As Traffic Grows

**Frontend (Vercel)**
- Automatic scaling on Vercel (no action needed)
- Monitor Core Web Vitals
- Consider code-splitting large routes

**Backend (Supabase)**
- Upgrade plan tier if hitting limits
- Supabase auto-scales within plan
- Monitor query performance

**Database**
- Add indexes as needed (already done for photos ordering)
- Monitor table sizes
- Archive old records if necessary

---

## 10. Support & Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Invalid API Key" error | Env var typo | Verify VITE_SUPABASE_ANON_KEY in Vercel |
| Forms not submitting | Backend unreachable | Check Supabase status page |
| Photos not displaying | Storage bucket not public | Check Supabase Storage settings |
| Build fails | Dependency issue | Run `npm ci` in `frontend/` directory |
| Migrations not applied | Wrong deployment target | Verify database link with `supabase link` |

### Getting Help

- **Frontend Issues**: Check Vercel logs → Deployments tab
- **Backend Issues**: Check Supabase logs → Dashboard → Logs
- **Database Issues**: Contact Supabase support
- **General Help**: See [FRONTEND_BACKEND_INTEGRATION.md](FRONTEND_BACKEND_INTEGRATION.md)

---

## 11. Production Checklist

Before going live, ensure:

- [ ] TypeScript builds without errors
- [ ] All environment variables set in Vercel
- [ ] Database migrations applied to production
- [ ] RLS policies active and tested
- [ ] SSL certificate working (HTTPS)
- [ ] Forms can submit without errors
- [ ] Images/photos load correctly
- [ ] Mobile responsive layouts work
- [ ] Search functionality works
- [ ] Authentication flows work
- [ ] Error pages display properly
- [ ] Analytics/monitoring enabled

---

## 12. Quick Reference

### Deployment Timeline

```
T-0: Commit to main, push to GitHub
T+1min: Vercel auto-detects, starts build
T+5min: Build complete, site live on preview URL
T+10min: DNS updates (if custom domain)
T+24h: Full DNS propagation complete
T+48h: Monitor for issues
```

### Key Commands

```bash
# Local development
cd frontend && npm run dev

# Build locally
npm run build

# Deploy to Vercel
vercel --prod

# Check deployment status
vercel list

# View logs
vercel logs campusstay.example.com
```

---

## 13. After Deployment

### Notify Team

1. Post deployment message to team:
   ```
   ✅ CampusStay TZ deployed to production
   
   - 13 new listing fields (security_deposit, floor, furnished, etc.)
   - 7-step listing form with auto-draft
   - Enhanced photo gallery with ordering
   - Occupied listings hidden from search
   - Full documentation: FRONTEND_BACKEND_INTEGRATION.md
   
   URL: https://campusstay.example.com
   Commit: e60fde4
   ```

2. Update status page
3. Monitor for first 24 hours
4. Send announcement emails to users (optional)

### Celebrate! 🎉

Deployment complete. The updated CampusStay TZ is now live with:
- ✅ Complete listing schema overhaul
- ✅ 7-step property listing form
- ✅ Enhanced photo management with ordering
- ✅ Improved user experience
- ✅ Better data validation
- ✅ Production-ready documentation

---

**Document Version**: 1.0  
**Last Updated**: March 31, 2026  
**Status**: ✅ Ready for Production

**Next Review**: April 7, 2026 (1 week post-launch)
