import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const DEEPVUE_AUTH_URL = 'https://api.deepvue.tech/v1/authorize';
const TOKEN_CACHE_KEY = 'deepvue_token_cache';

// In-memory cache for token
let tokenCache = null;

async function fetchNewToken(clientId, clientSecret) {
  const response = await fetch(DEEPVUE_AUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret
    })
  });

  if (!response.ok) {
    throw new Error(`Authorization failed: ${response.statusText}`);
  }

  const data = await response.json();
  
  // Cache token with expiry (23 hours to be safe, token valid for 24h)
  tokenCache = {
    access_token: data.access_token,
    expires_at: Date.now() + (23 * 60 * 60 * 1000) // 23 hours
  };

  return data.access_token;
}

function isTokenValid() {
  return tokenCache && tokenCache.expires_at > Date.now();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Service role is needed for background token management
    const clientId = Deno.env.get('DEEPVUE_CLIENT_ID');
    const clientSecret = Deno.env.get('DEEPVUE_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      return Response.json({ error: 'API credentials not configured' }, { status: 500 });
    }

    let accessToken;

    // Check if cached token is still valid
    if (isTokenValid()) {
      accessToken = tokenCache.access_token;
    } else {
      // Fetch new token
      accessToken = await fetchNewToken(clientId, clientSecret);
    }

    return Response.json({
      success: true,
      access_token: accessToken,
      cached: isTokenValid()
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      success: false
    }, { status: 500 });
  }
});