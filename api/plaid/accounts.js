import { getPlaidClient } from '../_plaidClient';
import { verifyAuth } from '../_auth';
import { getToken } from '../_tokenStore';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const userId = await verifyAuth(req);
    const tokenData = await getToken(userId);
    const accessToken = tokenData?.accessToken;
    if (!accessToken) return res.status(400).json({ error: 'No bank account connected' });

    const client = getPlaidClient();
    const response = await client.accountsGet({ access_token: accessToken });
    return res.status(200).json({
      accounts: response.data.accounts,
      item: response.data.item,
    });
  } catch (err) {
    const data = err.response?.data;
    console.error('accounts error', data || err.message);
    return res.status((err.statusCode || 500)).json({
      error: 'Failed to fetch accounts',
      code: data?.error_code,
      request_id: data?.request_id,
      message: data?.error_message || data?.display_message,
    });
  }
}
