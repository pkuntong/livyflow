import { getPlaidClient, tokenStore, getUserIdFromAuthHeader } from '../_plaidClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const client = getPlaidClient();
    const userId = getUserIdFromAuthHeader(req);
    const token = tokenStore.get(userId)?.accessToken;
    if (!token) return res.status(400).json({ error: 'No bank account connected' });

    const response = await client.accountsGet({ access_token: token });
    return res.status(200).json({
      accounts: response.data.accounts,
      item: response.data.item,
    });
  } catch (err) {
    console.error('accounts error', err.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to fetch accounts' });
  }
}
