# API URL Configuration for Production

## 🔧 **Problem Solved**
The frontend was hardcoded to use `localhost:8000` for API calls, which caused errors in production where the backend runs on a different domain.

## ✅ **Solution Implemented**

### **1. Environment Files Created**
- **`.env.local`** (Development)
  ```
  VITE_API_URL=http://localhost:8000
  VITE_ENVIRONMENT=development
  ```
- **`.env.production`** (Production)
  ```
  VITE_API_URL=https://api.livyflow.com
  VITE_ENVIRONMENT=production
  ```

### **2. Services Updated**
All frontend services now use environment variables instead of hardcoded URLs:

#### **Class-based Services** (using `this.baseURL`):
- ✅ `plaidService.js`
- ✅ `budgetService.js`
- ✅ `exportService.js`
- ✅ `alertsService.js`
- ✅ `reportsService.js`

#### **Function-based Services** (using `API_BASE_URL`):
- ✅ `notificationService.js`
- ✅ `alertService.js`
- ✅ `recurringSubscriptionsService.js`
- ✅ `budgetRecommendationsService.js`
- ✅ `trendsService.js`
- ✅ `emailPreferencesService.js`
- ✅ `insightService.js`
- ✅ `monthlyInsightsService.js`

### **3. Configuration Pattern**
```javascript
// For class-based services
this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// For function-based services
const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1`;
```

## 🚀 **Deployment Instructions**

### **For Development:**
1. The `.env.local` file is automatically used
2. API calls will go to `http://localhost:8000`
3. Vite proxy is still available as fallback

### **For Production:**
1. **Set environment variables** in your hosting platform:
   ```
   VITE_API_URL=https://api.livyflow.com
   VITE_ENVIRONMENT=production
   ```

2. **Build the application:**
   ```bash
   npm run build
   ```

3. **Deploy the built files** from the `dist/` directory

### **For Different Environments:**
- **Staging**: Set `VITE_API_URL=https://staging-api.livyflow.com`
- **Production**: Set `VITE_API_URL=https://api.livyflow.com`
- **Local**: Uses `http://localhost:8000` (default fallback)

## 🔍 **Verification**

### **Check Environment Variables:**
Open browser console and look for service initialization logs:
```
🔧 PlaidService initialized with API URL: https://api.livyflow.com
🔧 BudgetService initialized with API URL: https://api.livyflow.com
🔧 NotificationService initialized with API URL: https://api.livyflow.com/api/v1
```

### **Test API Calls:**
1. Open browser DevTools → Network tab
2. Perform any action that calls the API
3. Verify requests go to the correct domain

## 🛠 **Troubleshooting**

### **If API calls still go to localhost:**
1. Check that environment variables are set correctly
2. Verify the build process includes the environment variables
3. Clear browser cache and reload

### **If services show "localhost" in console:**
1. Check that `VITE_API_URL` is defined in your hosting environment
2. Verify the environment variable name (must start with `VITE_`)
3. Rebuild and redeploy the application

## 📝 **Notes**

- **Vite Environment Variables**: Must be prefixed with `VITE_` to be accessible in the frontend
- **Fallback**: If `VITE_API_URL` is not set, defaults to `http://localhost:8000`
- **Proxy**: Vite proxy is kept for development but services now use environment variables
- **Security**: Environment files are in `.gitignore` to prevent committing sensitive URLs

## 🔄 **Migration Complete**

✅ All services updated to use environment variables
✅ Development and production configurations ready
✅ Fallback mechanisms in place
✅ Documentation provided

The frontend will now correctly call your production API at `https://api.livyflow.com` instead of trying to reach `localhost:8000`. 