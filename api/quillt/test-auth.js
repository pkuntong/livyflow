import axios from 'axios';

function getClient() {
  const baseURL = process.env.QUILLT_BASE_URL;
  const apiKey = process.env.QUILLT_API_KEY;
  const secret = process.env.QUILLT_SECRET;
  const scheme = (process.env.QUILLT_AUTH_SCHEME || 'basic').toLowerCase();

  if (!baseURL) throw Object.assign(new Error('QUILLT_BASE_URL missing'), { statusCode: 500 });
  if (!apiKey || !secret) throw Object.assign(new Error('QUILLT_API_KEY/QUILLT_SECRET missing'), { statusCode: 500 });

  const instance = axios.create({ baseURL, timeout: 10000 });

  if (scheme === 'basic') {
    instance.defaults.auth = { username: apiKey, password: secret };
  } else if (scheme === 'headers') {
    const keyHeader = process.env.QUILLT_HEADER_KEY_NAME || 'X-API-Key';
    const secretHeader = process.env.QUILLT_HEADER_SECRET_NAME || 'X-API-Secret';
    instance.interceptors.request.use((config) => {
      config.headers[keyHeader] = apiKey;
      config.headers[secretHeader] = secret;
      return config;
    });
  } else if (scheme === 'bearer') {
    const token = process.env.QUILLT_BEARER_TOKEN;
    if (!token) throw Object.assign(new Error('QUILLT_BEARER_TOKEN missing'), { statusCode: 500 });
    instance.interceptors.request.use((config) => {
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
  }

  return instance;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const client = getClient();
    const path = process.env.QUILLT_TEST_PATH || '/ping';
    const r = await client.get(path);
    return res.status(200).json({ ok: true, status: r.status, data: r.data });
  } catch (err) {
    const status = err.statusCode || err.response?.status || 500;
    return res.status(status).json({ ok: false, error: err.message, details: err.response?.data });
  }
}
