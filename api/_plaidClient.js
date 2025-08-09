import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

// In-memory token store (note: ephemeral in serverless)
export const tokenStore = new Map(); // key: userId, value: { accessToken, itemId, storedAt }

export function getPlaidClient() {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  const env = (process.env.PLAID_ENV || 'sandbox').toLowerCase();

  if (!clientId || !secret) {
    throw new Error('PLAID_CLIENT_ID/PLAID_SECRET not configured');
  }

  const basePath =
    env === 'production' ? PlaidEnvironments.production
    : env === 'development' ? PlaidEnvironments.development
    : PlaidEnvironments.sandbox;

  const configuration = new Configuration({
    basePath,
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': clientId,
        'PLAID-SECRET': secret,
      },
    },
  });

  return new PlaidApi(configuration);
}

export function getRedirectUri() {
  return process.env.PLAID_REDIRECT_URI || undefined;
}
