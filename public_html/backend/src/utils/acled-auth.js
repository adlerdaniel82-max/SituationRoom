const axios = require('axios');
const env = require('../config/env');

const ACLED_TOKEN_URL = 'https://acleddata.com/oauth/token';
const REFRESH_LEEWAY_MS = 5 * 60 * 1000;

const tokenCache = {
  accessToken: '',
  refreshToken: '',
  expiresAt: 0
};

async function getAccessToken(options = {}) {
  const { forceRefresh = false } = options;

  if (!forceRefresh && tokenCache.accessToken && Date.now() < tokenCache.expiresAt) {
    return tokenCache.accessToken;
  }

  if (!forceRefresh && tokenCache.refreshToken) {
    try {
      return await refreshAccessToken(tokenCache.refreshToken);
    } catch {
      tokenCache.refreshToken = '';
    }
  }

  const password = env.sourceAuth.acled.password;
  const clientId = env.sourceAuth.acled.clientId;
  const usernames = [
    env.sourceAuth.acled.username,
    env.sourceAuth.acled.altUsername
  ].filter(Boolean);

  if (usernames.length === 0 || !password) {
    throw new Error('ACLED OAuth credentials are missing');
  }

  let lastError;

  for (const username of usernames) {
    try {
      const body = new URLSearchParams({
        username,
        password,
        grant_type: 'password',
        client_id: clientId
      });

      const response = await axios.post(ACLED_TOKEN_URL, body.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 15000
      });

      return storeTokens(response.data);
    } catch (error) {
      lastError = error;

      const status = error.response?.status;
      if (status && ![400, 401, 403].includes(status)) {
        throw error;
      }
    }
  }

  throw lastError || new Error('ACLED OAuth login failed');
}

async function refreshAccessToken(refreshToken) {
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
    client_id: env.sourceAuth.acled.clientId
  });

  const response = await axios.post(ACLED_TOKEN_URL, body.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    timeout: 15000
  });

  return storeTokens(response.data);
}

function storeTokens(payload) {
  const accessToken = payload?.access_token;
  const refreshToken = payload?.refresh_token || tokenCache.refreshToken;
  const expiresIn = Number(payload?.expires_in || 86400);

  if (!accessToken) {
    throw new Error('ACLED token response did not include an access_token');
  }

  tokenCache.accessToken = accessToken;
  tokenCache.refreshToken = refreshToken;
  tokenCache.expiresAt = Date.now() + Math.max((expiresIn * 1000) - REFRESH_LEEWAY_MS, 60 * 1000);

  return tokenCache.accessToken;
}

module.exports = {
  getAccessToken
};
