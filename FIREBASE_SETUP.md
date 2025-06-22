# Firebase Setup Guide

To enable authentication in LivyFlow, you need to set up Firebase and configure the environment variables.

## 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter a project name (e.g., "livyflow")
4. Follow the setup wizard

## 2. Enable Authentication

1. In your Firebase project, go to "Authentication" in the left sidebar
2. Click "Get started"
3. Go to the "Sign-in method" tab
4. Enable "Email/Password" authentication
5. Click "Save"

## 3. Get Your Firebase Config

1. In your Firebase project, click the gear icon (⚙️) next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps" section
4. Click the web icon (</>)
5. Register your app with a nickname (e.g., "LivyFlow Web")
6. Copy the Firebase configuration object

## 4. Set Environment Variables

Create a `.env` file in the root of your project with the following variables:

```env
VITE_FIREBASE_API_KEY=AIzaSyBGJTVRiAtz737PU5T7g5lODeIXU7urQ7A
VITE_FIREBASE_AUTH_DOMAIN=livyflow-1e676.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=livyflow-1e676
VITE_FIREBASE_STORAGE_BUCKET=livyflow-1e676.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=328683606176
VITE_FIREBASE_APP_ID=1:328683606176:web:63f2445cf79ed4031cb9c5
VITE_FIREBASE_MEASUREMENT_ID=G-BR26E6R520
```

**Important**: Replace these values with the actual values from your Firebase configuration if you're using a different Firebase project.

## 5. Start the Development Server

```bash
npm run dev
```

## Features Implemented

- ✅ User registration with email/password
- ✅ User login with email/password
- ✅ Form validation and error handling
- ✅ Loading states during authentication
- ✅ Protected routes (redirect to login if not authenticated)
- ✅ User session management
- ✅ Logout functionality
- ✅ User email display in the sidebar
- ✅ Automatic redirect to dashboard after successful login/signup

## Error Handling

The authentication system handles the following Firebase errors:
- Email already in use
- Weak password (less than 6 characters)
- Invalid email format
- General authentication failures 