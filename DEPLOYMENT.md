# 🚀 LivyFlow Deployment Guide

This guide will help you deploy LivyFlow to production environments.

## 📋 Pre-Deployment Checklist

- [ ] Remove all test credentials from `.env` files
- [ ] Ensure `.env` is in `.gitignore`
- [ ] Set up production Firebase project
- [ ] Configure production Plaid environment
- [ ] Set up SMTP for email notifications
- [ ] Choose hosting platforms

## 🏗️ Frontend Deployment

### Option 1: Vercel (Recommended)

1. **Install Vercel CLI:**
```bash
npm i -g vercel
```

2. **Deploy:**
```bash
vercel
```

3. **Configure environment variables in Vercel dashboard:**
   - `VITE_API_URL` - Your backend URL

### Option 2: Netlify

1. **Connect your GitHub repository**
2. **Build settings:**
   - Build command: `npm run build`
   - Publish directory: `dist`
3. **Add environment variables in Netlify dashboard**

### Option 3: Manual Build

```bash
# Build the project
./build.sh

# The dist/ folder contains your production build
```

## 🔧 Backend Deployment

### Option 1: Render

1. **Connect your GitHub repository**
2. **Build settings:**
   - Build command: `pip install -r requirements.txt`
   - Start command: `python run.py`
3. **Environment variables:**
   - Copy from `backend/env.example`
   - Set `ENVIRONMENT=production`
   - Update `ALLOWED_ORIGINS` with your frontend domain

### Option 2: Railway

1. **Connect your GitHub repository**
2. **Railway will auto-detect Python**
3. **Add environment variables in Railway dashboard**

### Option 3: Fly.io

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Create app
fly launch

# Deploy
fly deploy
```

### Option 4: Heroku

1. **Create Procfile:**
```
web: python run.py
```

2. **Deploy:**
```bash
heroku create your-app-name
git push heroku main
```

## 🔐 Environment Variables

### Production Environment Variables

Create a `.env` file in your backend directory:

```env
# Environment
ENVIRONMENT=production
DEBUG=false
HOST=0.0.0.0
PORT=8000

# CORS - Add your production domain
ALLOWED_ORIGINS=https://yourdomain.com

# Firebase (Production)
FIREBASE_PROJECT_ID=your-production-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40your-project.iam.gserviceaccount.com

# Plaid (Production)
PLAID_CLIENT_ID=your-plaid-client-id
PLAID_SECRET=your-plaid-secret
PLAID_ENV=production

# Email
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=noreply@yourdomain.com

# Security
SECRET_KEY=your-super-secret-key-change-this
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

## 🔒 Security Checklist

### Backend Security
- [ ] Set `ENVIRONMENT=production`
- [ ] Set `DEBUG=false`
- [ ] Use strong `SECRET_KEY`
- [ ] Configure proper CORS origins
- [ ] Enable HTTPS
- [ ] Use secure cookies
- [ ] Remove debug logs

### Frontend Security
- [ ] Use HTTPS in production
- [ ] Set up Content Security Policy
- [ ] Configure Firebase App Check (optional)
- [ ] Use environment variables for API URLs

### Authentication Security
- [ ] Configure Firebase production project
- [ ] Add production domain to authorized domains
- [ ] Set up proper redirect URLs
- [ ] Enable email verification (optional)

## 🌐 Domain Configuration

### Firebase Configuration
1. Go to Firebase Console > Authentication > Settings
2. Add your production domain to "Authorized domains"
3. Configure OAuth redirect URLs

### CORS Configuration
Update `ALLOWED_ORIGINS` in your backend environment:
```env
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

## 📧 Email Configuration

### Gmail Setup
1. Enable 2-factor authentication
2. Generate App Password
3. Use App Password in SMTP configuration

### Other SMTP Providers
- **SendGrid:** Use their SMTP settings
- **Mailgun:** Use their SMTP settings
- **AWS SES:** Use their SMTP settings

## 🔍 Post-Deployment Testing

### Health Checks
```bash
# Test backend health
curl https://your-backend-domain.com/api/health

# Test frontend
curl https://your-frontend-domain.com
```

### Feature Testing
- [ ] User registration/login
- [ ] Plaid bank connection
- [ ] Transaction fetching
- [ ] Budget creation
- [ ] Email notifications
- [ ] Weekly summaries

## 📊 Monitoring

### Recommended Tools
- **Backend:** Sentry for error tracking
- **Frontend:** Vercel Analytics or Google Analytics
- **Performance:** Lighthouse CI
- **Uptime:** UptimeRobot or Pingdom

### Logging
- Backend logs are automatically configured for production
- Log level: WARNING (reduces noise)
- Consider using structured logging for better analysis

## 🚨 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Check `ALLOWED_ORIGINS` configuration
   - Ensure frontend URL is included

2. **Authentication Failures**
   - Verify Firebase configuration
   - Check domain authorization

3. **Plaid Connection Issues**
   - Ensure `PLAID_ENV=production`
   - Verify webhook URLs (if using)

4. **Email Not Working**
   - Check SMTP credentials
   - Verify app passwords for Gmail

### Debug Mode
For troubleshooting, temporarily enable debug mode:
```env
DEBUG=true
ENVIRONMENT=development
```

## 📈 Scaling Considerations

### Database
- Consider migrating from in-memory storage to a proper database
- Options: PostgreSQL, MongoDB, Firebase Firestore

### Caching
- Implement Redis for session storage
- Add CDN for static assets

### Load Balancing
- Use multiple backend instances
- Implement health checks

## 🔄 CI/CD Pipeline

### GitHub Actions Example
```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
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

## 📞 Support

If you encounter issues during deployment:
1. Check the logs in your hosting platform
2. Verify environment variables
3. Test locally with production settings
4. Check the troubleshooting section above

---

**Happy Deploying! 🚀** 