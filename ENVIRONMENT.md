# Environment Configuration

This project uses:
- Vercel env vars for serverless functions and secrets
- Vite `.env.local` for frontend Firebase config only (never server secrets)

## Vercel Project Settings → Environment Variables

Required (Plaid serverless):
- PLAID_CLIENT_ID
- PLAID_SECRET
- PLAID_ENV (production | development | sandbox)
- PLAID_REDIRECT_URI (e.g., https://yourdomain.com/plaid-oauth-return)

Required (Firebase Admin for API auth verification):
- FIREBASE_PROJECT_ID
- FIREBASE_CLIENT_EMAIL
- FIREBASE_PRIVATE_KEY  # paste as one line with \n for newlines

Optional (Vercel KV for Plaid token persistence):
- KV_URL (and any additional KV credentials required by your account)

Optional (Quillt sandbox):
- QUILLT_BASE_URL
- QUILLT_API_KEY
- QUILLT_SECRET
- QUILLT_AUTH_SCHEME=basic|headers|bearer (default: basic)
- QUILLT_HEADER_KEY_NAME (if headers scheme; default: X-API-Key)
- QUILLT_HEADER_SECRET_NAME (if headers scheme; default: X-API-Secret)
- QUILLT_BEARER_TOKEN (if bearer scheme)
- QUILLT_TEST_PATH=/ping (or your test endpoint)

## Frontend (Vite) – .env.local
Create `./.env.local` for local dev (do not commit):
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```

Notes:
- Never put PLAID_* or FIREBASE_PRIVATE_KEY in `.env.local`; those belong in Vercel env vars only.
- For production, set all required env vars in Vercel and redeploy.
