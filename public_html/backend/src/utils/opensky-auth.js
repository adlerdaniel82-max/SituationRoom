const axios = require('axios');
const env = require('../config/env');

const OPENSKY_TOKEN_URL = 'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token';
const REFRESH_LEEWAY_MS = 60 * 1000;

const tokenCache = {
  accessToken: '',
  expiresAt: 0
};

async function getAccessToken(options = {}) {
  const { forceRefresh = false } = options;

  if (!forceRefresh && tokenCache.accessToken && Date.now() < tokenCache.expiresAt) {
    return tokenCache.accessToken;
  }

  const clientId = env.sourceAuth.opensky.clientId;
  const clientSecret = env.sourceAuth.opensky.clientSecret;

  if (!clientId || !clientSecret) {
    throw new Error('OpenSky OAuth credentials are missing');
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret
  });

  const response = await axios.post(OPENSKY_TOKEN_URL, body.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    timeout: 15000
  });

  const accessToken = response.data?.access_token;
  const expiresIn = Number(response.data?.expires_in || 1800);

  if (!accessToken) {
    throw new Error('OpenSky token response did not include an access_token');
  }

  tokenCache.accessToken = accessToken;
  tokenCache.expiresAt = Date.now() + Math.max((expiresIn * 1000) - REFRESH_LEEWAY_MS, 60 * 1000);

  return tokenCache.accessToken;
}

module.exports = {
  getAccessToken
};
