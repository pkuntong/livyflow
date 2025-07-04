// Test environment variables loading
console.log('=== Environment Variables Test ===');
console.log('🔍 Checking Firebase environment variables...');

const firebaseVars = {
  'VITE_FIREBASE_API_KEY': import.meta.env.VITE_FIREBASE_API_KEY,
  'VITE_FIREBASE_AUTH_DOMAIN': import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  'VITE_FIREBASE_PROJECT_ID': import.meta.env.VITE_FIREBASE_PROJECT_ID,
  'VITE_FIREBASE_STORAGE_BUCKET': import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  'VITE_FIREBASE_MESSAGING_SENDER_ID': import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  'VITE_FIREBASE_APP_ID': import.meta.env.VITE_FIREBASE_APP_ID,
  'VITE_FIREBASE_MEASUREMENT_ID': import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Check each variable
Object.entries(firebaseVars).forEach(([key, value]) => {
  if (value) {
    console.log(`✅ ${key}: ${value.substring(0, 20)}${value.length > 20 ? '...' : ''}`);
  } else {
    console.error(`❌ ${key}: UNDEFINED`);
  }
});

// Check if all required variables are present
const requiredVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN', 
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

const missingVars = requiredVars.filter(varName => !import.meta.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required Firebase environment variables:', missingVars);
  console.error('🔧 Please check your .env file and restart the dev server');
} else {
  console.log('✅ All required Firebase environment variables are present');
}

console.log('=== End Environment Variables Test ===');

// Test environment variables
console.log("🔍 Environment Variables Test:");
console.log("VITE_API_URL:", import.meta.env.VITE_API_URL);
console.log("VITE_ENVIRONMENT:", import.meta.env.VITE_ENVIRONMENT);
console.log("🔗 Current API URL:", import.meta.env.VITE_API_URL || 'http://localhost:8000');
console.log("🌍 Environment:", import.meta.env.VITE_ENVIRONMENT || 'development');

// Test if backend is reachable
fetch('http://localhost:8000/api/health')
  .then(response => response.json())
  .then(data => {
    console.log("✅ Backend health check successful:", data);
  })
  .catch(error => {
    console.error("❌ Backend health check failed:", error);
  }); 