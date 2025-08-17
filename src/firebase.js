import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Firebase configuration with validation
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Validate Firebase configuration
const requiredFields = [
  'apiKey',
  'authDomain', 
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId'
];

const missingFields = requiredFields.filter(field => !firebaseConfig[field]);

if (missingFields.length > 0) {
  console.error('❌ Firebase Configuration Error: Missing required fields:', missingFields);
  console.error('🔧 Please check your environment variables and ensure all VITE_FIREBASE_* variables are set');
  console.error('📋 Current config:', firebaseConfig);
  
  // Show which specific environment variables are missing
  missingFields.forEach(field => {
    const envVar = `VITE_FIREBASE_${field.replace(/([A-Z])/g, '_$1').toUpperCase()}`;
    console.error(`   Missing: ${envVar} = ${firebaseConfig[field] || 'undefined'}`);
  });
  
  // In production, create a mock config to prevent white screen
  if (import.meta.env.PROD) {
    console.warn('🚨 Running with mock Firebase config in production - authentication will not work');
    // Don't throw in production, let the app show the login page with an error message
  } else {
    throw new Error(`Firebase configuration incomplete. Missing: ${missingFields.join(', ')}`);
  }
}

// Log successful configuration (without sensitive data)
console.log('✅ Firebase Configuration Loaded Successfully');
console.log('🏠 Auth Domain:', firebaseConfig.authDomain);
console.log('📁 Project ID:', firebaseConfig.projectId);
console.log('🆔 API Key (first 10 chars):', firebaseConfig.apiKey?.substring(0, 10) + '...');

// Initialize Firebase
let app;
try {
  // Only initialize if we have all required fields or if we're providing defaults
  if (missingFields.length > 0 && import.meta.env.PROD) {
    // Use a mock config for production to prevent white screen
    const mockConfig = {
      apiKey: 'mock-api-key',
      authDomain: 'mock-project.firebaseapp.com',
      projectId: 'mock-project',
      storageBucket: 'mock-project.appspot.com',
      messagingSenderId: '123456789',
      appId: '1:123456789:web:abcdef123456',
    };
    app = initializeApp(mockConfig);
    console.warn('🚨 Firebase initialized with mock config - authentication will not work');
  } else {
    app = initializeApp(firebaseConfig);
    console.log('🚀 Firebase App Initialized Successfully');
  }
} catch (error) {
  console.error('❌ Firebase Initialization Error:', error);
  console.error('🔧 Please check your Firebase configuration values');
  if (!import.meta.env.PROD) {
    throw error;
  } else {
    console.warn('🚨 Continuing with mock Firebase in production');
    app = initializeApp({
      apiKey: 'mock-api-key',
      authDomain: 'mock-project.firebaseapp.com',
      projectId: 'mock-project',
      storageBucket: 'mock-project.appspot.com',
      messagingSenderId: '123456789',
      appId: '1:123456789:web:abcdef123456',
    });
  }
}

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
console.log('🔐 Firebase Auth Initialized Successfully');

export default app; 