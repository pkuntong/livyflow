# LivyFlow Backend

FastAPI backend for LivyFlow with Plaid integration.

## Setup

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Create environment file:**
   Create a `.env` file in the backend directory with:
   ```env
   # Plaid API Configuration
   PLAID_CLIENT_ID=your_plaid_client_id_here
   PLAID_SECRET=your_plaid_secret_here
   PLAID_ENV=sandbox  # sandbox, development, or production
   
   # JWT Configuration
   SECRET_KEY=your_jwt_secret_key_here
   
   # Server Configuration
   HOST=0.0.0.0
   PORT=8000
   ```

3. **Get Plaid credentials:**
   - Sign up at [Plaid Dashboard](https://dashboard.plaid.com/)
   - Create a new app
   - Copy your Client ID and Secret
   - Set the environment (sandbox for development)

4. **Run the server:**
   ```bash
   python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

## API Endpoints

### GET `/api/v1/plaid/link-token`
- **Authentication:** Required (Bearer token)
- **Description:** Creates a Plaid link token for the authenticated user
- **Response:**
  ```json
  {
    "link_token": "link-sandbox-...",
    "user_id": "user123"
  }
  ```

## Authentication

The API uses JWT Bearer tokens for authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
``` 