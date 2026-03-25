// Token cache to avoid unnecessary API calls
let cachedToken = null;
let tokenExpiry = null;

const AUTH_URL = 'https://production.deepvue.tech/v1/authorize';

async function fetchNewToken(clientId, clientSecret) {
  // Use FormData as per Deepvue documentation
  const formData = new FormData();
  formData.append('client_id', clientId);
  formData.append('client_secret', clientSecret);

  const response = await fetch(AUTH_URL, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Auth failed (${response.status}): ${error}`);
  }

  const data = await response.json();
  return data;
}

function isTokenValid() {
  if (!cachedToken || !tokenExpiry) {
    return false;
  }
  // Check if token expires in next 5 minutes
  return Date.now() < (tokenExpiry - 5 * 60 * 1000);
}

Deno.serve(async (req) => {
  try {
    const clientId = Deno.env.get('DEEPVUE_CLIENT_ID');
    const clientSecret = Deno.env.get('DEEPVUE_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      return Response.json({ 
        success: false, 
        error: 'API credentials not configured' 
      }, { status: 500 });
    }

    // Return cached token if valid
    if (isTokenValid()) {
      return Response.json({
        success: true,
        access_token: cachedToken,
        cached: true
      });
    }

    // Fetch new token
    const authData = await fetchNewToken(clientId, clientSecret);
    
    if (!authData.access_token) {
      throw new Error('No access token in response');
    }

    // Cache the token (valid for 24 hours as per docs)
    cachedToken = authData.access_token;
    tokenExpiry = Date.now() + (23 * 60 * 60 * 1000); // 23 hours to be safe

    return Response.json({
      success: true,
      access_token: cachedToken,
      token_type: authData.token_type,
      cached: false
    });

  } catch (error) {
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});