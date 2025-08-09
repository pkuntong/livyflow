# 🚀 LivyFlow Deployment Guide (Vercel)

This guide covers deploying LivyFlow using Vercel for both the React app and the Plaid API via serverless functions.

## ✅ Pre-Deployment Checklist
- Vercel project created and connected to GitHub
- Firebase Web App config ready (VITE_FIREBASE_*)
- Plaid credentials ready (CLIENT_ID, SECRET, ENV)
- OAuth Redirect URI added in Plaid Dashboard (e.g., https://yourdomain.com/plaid-oauth-return)

## 🔐 Environment Variables (Vercel → Project → Settings → Environment Variables)
- VITE_FIREBASE_API_KEY
- VITE_FIREBASE_AUTH_DOMAIN
- VITE_FIREBASE_PROJECT_ID
- VITE_FIREBASE_STORAGE_BUCKET
- VITE_FIREBASE_MESSAGING_SENDER_ID
- VITE_FIREBASE_APP_ID
- VITE_FIREBASE_MEASUREMENT_ID (optional)
- PLAID_CLIENT_ID
- PLAID_SECRET
- PLAID_ENV (production | development | sandbox)
- PLAID_REDIRECT_URI (e.g., https://yourdomain.com/plaid-oauth-return)

## 🏗️ Build & Deploy
Vercel will use the repo settings:
- Build command: vite build (via vercel.json)
- Output directory: dist
- SPA rewrites exclude /api so serverless functions work

Deploy steps:
```bash
npm i -g vercel
vercel  # first-time link
vercel --prod
```

## 🔌 API (Serverless on Vercel)
The following routes are implemented in `api/`:
- `GET /api/plaid/link-token` — Create Plaid Link token (uses optional PLAID_REDIRECT_URI)
- `POST /api/plaid/exchange-token` — Exchange public token and store access token in memory
- `GET /api/plaid/accounts` — Fetch connected accounts
- `GET /api/plaid/transactions` — Fetch recent transactions (optional start_date, end_date, count)

Frontend services call same-origin `/api/...` so no CORS setup is needed.

## 🔄 Local Development
```bash
npm install
npm run dev
```
Vite will serve the React app. You can call the serverless routes locally using `vercel dev` if desired:
```bash
vercel dev
```

## 🧪 Testing
```bash
npm test
```

## 📁 Structure
```
LivyFlow/
├── api/                    # Vercel functions (Plaid)
├── public/
├── src/
│   ├── components/
│   ├── services/           # Calls to /api
│   └── contexts/
├── vercel.json
└── package.json
```

## 🔒 Security
- Keep PLAID_* and VITE_FIREBASE_* in Vercel env vars
- Use HTTPS domains
- Do not log secrets; audit logs in production

## 🧠 Notes
- Access tokens are stored in memory in serverless functions; for production-grade persistence, wire up a database or Vercel KV.

## 🆘 Troubleshooting
- Link token errors: confirm all Plaid vars, especially `PLAID_REDIRECT_URI` for OAuth banks
- After OAuth redirect: ensure the redirect URI returns the SPA (the default SPA rewrite handles this)
- 404 on /api: check rewrites in `vercel.json` — it should exclude `/api/*`

---

Happy Deploying! 🚀 