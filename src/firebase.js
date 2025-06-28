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
  console.error('🔧 Please check your .env file and ensure all VITE_FIREBASE_* variables are set');
  console.error('📋 Current config:', firebaseConfig);
  
  // Show which specific environment variables are missing
  missingFields.forEach(field => {
    const envVar = `VITE_FIREBASE_${field.toUpperCase()}`;
    console.error(`   Missing: ${envVar}`);
  });
  
  throw new Error(`Firebase configuration incomplete. Missing: ${missingFields.join(', ')}`);
}

// Log successful configuration (without sensitive data)
console.log('✅ Firebase Configuration Loaded Successfully');
console.log('🏠 Auth Domain:', firebaseConfig.authDomain);
console.log('📁 Project ID:', firebaseConfig.projectId);
console.log('🆔 API Key (first 10 chars):', firebaseConfig.apiKey?.substring(0, 10) + '...');

// Initialize Firebase
let app;
try {
  app = initializeApp(firebaseConfig);
  console.log('🚀 Firebase App Initialized Successfully');
} catch (error) {
  console.error('❌ Firebase Initialization Error:', error);
  console.error('🔧 Please check your Firebase configuration values');
  throw error;
}

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
console.log('🔐 Firebase Auth Initialized Successfully');

export default app; 