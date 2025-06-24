# LivyFlow - Personal Financial Planner & Budget Tracker

**LivyFlow** is a modern, user-friendly financial planning and budgeting app that helps users connect their bank accounts, automatically categorize transactions, set budgets, track spending insights, and achieve savings goals — all in one clean interface.

---

## 🚀 Features

- **Bank Account Integration**  
  Securely connect checking, savings, credit card, and investment accounts via Plaid API.

- **Automatic Transaction Import & Categorization**  
  Transactions are fetched and automatically categorized for easy tracking.

- **Smart Budgeting Tools**  
  Create customizable budgets by category and monitor spending progress in real-time with AI-powered suggestions.

- **Comprehensive Dashboard**  
  Visualize spending trends with charts, reports, and insights over selectable time periods.

- **Weekly Email Summaries**  
  Receive detailed weekly spending summaries and budget alerts via email.

- **Smart Notifications & Alerts**  
  Get notified about budget overruns, unusual spending, and account balance changes.

- **Secure Authentication**  
  User login via Firebase Authentication with email/password or Google OAuth.

---

## 🛠️ Tech Stack

- **Frontend:** React.js with Vite, Tailwind CSS
- **Backend:** FastAPI (Python) with APScheduler
- **Authentication:** Firebase Authentication
- **Bank Integration:** Plaid API
- **Email:** SMTP with Jinja2 templates
- **Charts:** Recharts for data visualization

---

## 📋 Prerequisites

- Node.js 18+
- Python 3.9+
- Firebase project
- Plaid API keys
- SMTP credentials (for email notifications)

---

## 🏃‍♂️ Quick Start (Local Development)

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/LivyFlow.git
cd LivyFlow
```

### 2. Frontend Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### 3. Backend Setup
```bash
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Create .env file (see Environment Variables section)
cp .env.example .env

# Start backend server
python run.py
```

### 4. Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=your-cert-url

# Plaid Configuration
PLAID_CLIENT_ID=your-plaid-client-id
PLAID_SECRET=your-plaid-secret
PLAID_ENV=sandbox  # or production

# Email Configuration (for weekly summaries)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=noreply@livyflow.com
```

### 5. Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication (Email/Password and Google)
3. Download service account key and add to environment variables
4. Add your domain to authorized domains

### 6. Plaid Setup

1. Create a Plaid account at [Plaid Dashboard](https://dashboard.plaid.com/)
2. Get your Client ID and Secret
3. Set up webhook endpoints (optional)

---

## 🚀 Deployment

### Frontend Deployment (Vercel/Netlify)

1. **Build the project:**
```bash
npm run build
```

2. **Deploy to Vercel:**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

3. **Deploy to Netlify:**
   - Connect your GitHub repository
   - Build command: `npm run build`
   - Publish directory: `dist`

### Backend Deployment

#### Option 1: Render
1. Connect your GitHub repository
2. Build command: `pip install -r requirements.txt`
3. Start command: `python run.py`
4. Add environment variables in Render dashboard

#### Option 2: Railway
1. Connect your GitHub repository
2. Railway will auto-detect Python
3. Add environment variables in Railway dashboard

#### Option 3: Fly.io
```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Create app
fly launch

# Deploy
fly deploy
```

### Database (Optional)

For production, consider using:
- **Supabase** (PostgreSQL with real-time features)
- **PlanetScale** (MySQL with branching)
- **MongoDB Atlas** (NoSQL)

---

## 🔧 Configuration

### Production Settings

1. **Update CORS origins** in `backend/app/main.py`:
```python
allow_origins=["https://yourdomain.com"]
```

2. **Set Plaid to production:**
```env
PLAID_ENV=production
```

3. **Configure HTTPS:**
   - Use a reverse proxy (nginx)
   - Or deploy on platforms with built-in HTTPS

### Security Checklist

- [ ] Remove debug logs in production
- [ ] Use secure cookies for sessions
- [ ] Enable HTTPS
- [ ] Set up proper CORS
- [ ] Use environment variables for secrets
- [ ] Enable Firebase App Check (optional)

---

## 📁 Project Structure

```
LivyFlow/
├── src/                    # Frontend React components
│   ├── components/         # Reusable UI components
│   │   ├── components/     # Reusable UI components
│   │   └── Pages/         # Page components
│   ├── services/          # API service functions
│   └── contexts/          # React contexts
├── backend/               # FastAPI backend
│   ├── app/              # Backend application
│   │   ├── main.py       # Main FastAPI app
│   │   ├── auth.py       # Authentication logic
│   │   ├── email_service.py  # Email functionality
│   │   └── scheduler.py  # Background tasks
│   └── requirements.txt  # Python dependencies
├── public/               # Static assets
└── package.json         # Frontend dependencies
```

---

## 🧪 Testing

### Backend Testing
```bash
cd backend
python -m pytest tests/
```

### Frontend Testing
```bash
npm test
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🆘 Support

- **Documentation:** [Wiki](https://github.com/yourusername/LivyFlow/wiki)
- **Issues:** [GitHub Issues](https://github.com/yourusername/LivyFlow/issues)
- **Discussions:** [GitHub Discussions](https://github.com/yourusername/LivyFlow/discussions)

---

## 🙏 Acknowledgments

- [Plaid](https://plaid.com/) for bank integration
- [Firebase](https://firebase.google.com/) for authentication
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Recharts](https://recharts.org/) for data visualization