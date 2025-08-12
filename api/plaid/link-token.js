import { Products, CountryCode } from 'plaid';
import { getPlaidClient, getRedirectUri } from '../_plaidClient.js';
import { verifyAuth } from '../_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const userId = await verifyAuth(req);
    const client = getPlaidClient();
    const redirect_uri = getRedirectUri();

    const request = {
      user: { client_user_id: userId },
      client_name: 'LivyFlow',
      products: [Products.Auth, Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
      ...(redirect_uri ? { redirect_uri } : {}),
    };

    const response = await client.linkTokenCreate(request);
    return res.status(200).json({ link_token: response.data.link_token });
  } catch (err) {
    const data = err.response?.data;
    console.error('link-token error', data || err.message);
    return res.status( (err.statusCode || 500) ).json({
      error: 'Failed to create link token',
      code: data?.error_code,
      request_id: data?.request_id,
      message: data?.error_message || data?.display_message,
    });
  }
}
