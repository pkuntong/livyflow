// Simple token store with Vercel KV if available; falls back to in-memory
let memoryStore = new Map();

function kvAvailable() {
  return !!process.env.KV_URL; // heuristic; you can also dynamic import @vercel/kv
}

export async function setToken(userId, { accessToken, itemId }) {
  const data = { accessToken, itemId, storedAt: new Date().toISOString() };
  if (kvAvailable()) {
    const { kv } = await import('@vercel/kv');
    await kv.hset(`plaid:${userId}`, data);
  } else {
    memoryStore.set(userId, data);
  }
}

export async function getToken(userId) {
  if (kvAvailable()) {
    const { kv } = await import('@vercel/kv');
    const data = await kv.hgetall(`plaid:${userId}`);
    return data && Object.keys(data).length ? data : null;
  }
  return memoryStore.get(userId) || null;
}
