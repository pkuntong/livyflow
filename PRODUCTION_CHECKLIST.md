# 🚀 LivyFlow Production Deployment Checklist

## ✅ Pre-Deployment Tasks

### Environment & Security
- [x] `.env` files are in `.gitignore`
- [x] Production environment configuration created (`backend/env.example`)
- [x] CORS configuration supports production domains
- [x] Debug logging disabled in production
- [x] Security settings configured

### Backend Configuration
- [x] Production-ready config system (`backend/app/config.py`)
- [x] Environment-based logging (WARNING level in production)
- [x] CORS middleware with proper origins
- [x] Health check endpoint (`/api/health`)
- [x] Debug route for testing (`/api/v1/debug/send-test-summary`)

### Frontend Configuration
- [x] Build script created (`build.sh`)
- [x] Production build tested and working
- [x] Vite configuration optimized for production
- [x] Environment variables support

## 🔧 Deployment Steps

### 1. Environment Setup
```bash
# Backend
cd backend
cp env.example .env
# Edit .env with your production values

# Frontend
# Set VITE_API_URL in your hosting platform
```

### 2. Backend Deployment
Choose one of these platforms:

**Render (Recommended):**
- Connect GitHub repository
- Build: `pip install -r requirements.txt`
- Start: `python run.py`
- Add environment variables

**Railway:**
- Connect GitHub repository
- Auto-detects Python
- Add environment variables

**Fly.io:**
```bash
fly launch
fly deploy
```

### 3. Frontend Deployment
Choose one of these platforms:

**Vercel (Recommended):**
```bash
npm i -g vercel
vercel
```

**Netlify:**
- Connect GitHub repository
- Build: `npm run build`
- Publish: `dist`

**Manual:**
```bash
./build.sh
# Deploy dist/ folder
```

## 🔐 Security Checklist

### Backend Security
- [ ] Set `ENVIRONMENT=production`
- [ ] Set `DEBUG=false`
- [ ] Use strong `SECRET_KEY`
- [ ] Configure `ALLOWED_ORIGINS` with your domain
- [ ] Enable HTTPS (automatic on most platforms)
- [ ] Remove any test credentials

### Firebase Configuration
- [ ] Create production Firebase project
- [ ] Add production domain to authorized domains
- [ ] Configure OAuth redirect URLs
- [ ] Download production service account key

### Plaid Configuration
- [ ] Set `PLAID_ENV=production`
- [ ] Use production API keys
- [ ] Configure webhook URLs (if using)

### Email Configuration
- [ ] Set up production SMTP credentials
- [ ] Use app passwords for Gmail
- [ ] Test weekly email functionality

## 🌐 Domain Configuration

### Required Environment Variables
```env
# Backend
ENVIRONMENT=production
DEBUG=false
ALLOWED_ORIGINS=https://yourdomain.com

# Frontend
VITE_API_URL=https://your-backend-domain.com
```

### Firebase Settings
1. Go to Firebase Console > Authentication > Settings
2. Add your production domain to "Authorized domains"
3. Update OAuth redirect URLs

## 🧪 Post-Deployment Testing

### Health Checks
```bash
# Test backend
curl https://your-backend-domain.com/api/health

# Test frontend
curl https://your-frontend-domain.com
```

### Feature Testing
- [ ] User registration/login
- [ ] Google OAuth
- [ ] Plaid bank connection
- [ ] Transaction fetching
- [ ] Budget creation and management
- [ ] Email preferences
- [ ] Weekly email summaries
- [ ] Notifications and alerts

### Email Testing
```bash
# Test weekly email (replace USER_ID)
curl "https://your-backend-domain.com/api/v1/debug/send-test-summary?user_id=YOUR_USER_ID"
```

## 📊 Monitoring Setup

### Recommended Tools
- **Error Tracking:** Sentry
- **Analytics:** Vercel Analytics or Google Analytics
- **Performance:** Lighthouse CI
- **Uptime:** UptimeRobot

### Log Monitoring
- Backend logs are automatically configured
- Log level: WARNING (production)
- Monitor for errors and performance issues

## 🚨 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Check `ALLOWED_ORIGINS` includes your frontend domain
   - Ensure HTTPS is used in production

2. **Authentication Failures**
   - Verify Firebase domain authorization
   - Check OAuth redirect URLs

3. **Plaid Connection Issues**
   - Ensure `PLAID_ENV=production`
   - Verify production API keys

4. **Email Not Working**
   - Check SMTP credentials
   - Verify app passwords for Gmail

### Debug Mode (Temporary)
```env
DEBUG=true
ENVIRONMENT=development
```

## 📈 Performance Optimization

### Frontend
- [ ] Enable code splitting
- [ ] Optimize bundle size
- [ ] Use CDN for static assets
- [ ] Implement lazy loading

### Backend
- [ ] Add database (PostgreSQL/MongoDB)
- [ ] Implement caching (Redis)
- [ ] Add rate limiting
- [ ] Optimize database queries

## 🔄 CI/CD Pipeline

### GitHub Actions Example
```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## 📞 Support Resources

- **Documentation:** [README.md](README.md)
- **Deployment Guide:** [DEPLOYMENT.md](DEPLOYMENT.md)
- **Backend Logs:** Check your hosting platform
- **Frontend Logs:** Browser developer tools

---

## 🎉 Deployment Complete!

Once all items are checked, your LivyFlow application is ready for production use!

**Remember:**
- Monitor your application regularly
- Set up alerts for downtime
- Keep dependencies updated
- Backup your data regularly
- Test new features in staging first

**Happy Deploying! 🚀** 