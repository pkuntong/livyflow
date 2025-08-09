# LivyFlow - Personal Financial Planner & Budget Tracker

LivyFlow is a modern budgeting app with secure bank connection (Plaid), insights, alerts, and a clean UI.

---

## 🚀 Features
- Bank account connection via Plaid (OAuth ready, e.g., Bank of America)
- Automatic transaction import & categorization
- Budgets, insights, alerts & notifications
- Firebase Authentication
- Responsive UI with Tailwind

---

## 🛠️ Tech Stack
- Frontend: React + Vite + Tailwind
- API: Vercel Serverless Functions (`/api/*`) using Plaid SDK
- Auth: Firebase Authentication

---

## 📋 Prerequisites
- Node.js 18+
- Plaid Client ID & Secret
- Firebase Web App config (VITE_FIREBASE_*)

---

## 🏃‍♂️ Quick Start (Local)
```bash
npm install
npm run dev
```

Environment variables (Vite, in `.env.local`):
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```

---

## 🔌 Plaid Setup (Vercel)
Set these in Vercel → Project → Settings → Environment Variables:
- PLAID_CLIENT_ID
- PLAID_SECRET
- PLAID_ENV (production | development | sandbox)
- PLAID_REDIRECT_URI (e.g., https://livyflow.com/plaid-oauth-return)

Also add the same redirect URI in the Plaid Dashboard (OAuth Redirect URIs).

---

## 🚀 Deployment (Vercel)
- Build command: handled via `vercel.json` (vite)
- Output directory: `dist`
- API routes live under `api/`:
  - `GET /api/plaid/link-token`
  - `POST /api/plaid/exchange-token`
  - `GET /api/plaid/accounts`
  - `GET /api/plaid/transactions`

`vercel.json` excludes `/api/*` from SPA rewrites so both the app and functions work together.

---

## 📁 Project Structure
```
LivyFlow/
├── api/                    # Vercel serverless functions (Plaid)
├── public/                 # Static assets
├── src/                    # React app
│   ├── components/
│   ├── services/           # Calls to same-origin /api
│   └── contexts/
├── package.json
└── vercel.json
```

---

## 🧪 Testing
```bash
npm test
```

---

## 🔒 Security
- Do not commit secrets
- Use Vercel env vars for PLAID_* and Firebase
- Use HTTPS domains in production

---

## 🆘 Support
- Issues: GitHub Issues

---

## 🙏 Acknowledgments
- Plaid, Firebase, Tailwind, Recharts