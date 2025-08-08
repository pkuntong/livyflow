import { LinkTokenCreateRequest, Products, CountryCode } from 'plaid';
import { getPlaidClient, getRedirectUri, getUserIdFromAuthHeader } from '../_plaidClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const client = getPlaidClient();
    const userId = getUserIdFromAuthHeader(req);
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
    console.error('link-token error', err.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to create link token' });
  }
}
