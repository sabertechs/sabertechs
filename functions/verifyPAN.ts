import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const DEEPVUE_PAN_URL = 'https://api.deepvue.tech/v1/verification/pan';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pan_number, name } = await req.json();

    if (!pan_number) {
      return Response.json({ error: 'PAN number is required' }, { status: 400 });
    }

    const clientSecret = Deno.env.get('DEEPVUE_CLIENT_SECRET');

    if (!clientSecret) {
      return Response.json({ error: 'API credentials not configured' }, { status: 500 });
    }

    // Get access token using cached token function
    const tokenResponse = await base44.functions.invoke('getDeepvueToken', {});
    
    if (!tokenResponse.data.success) {
      throw new Error('Failed to get access token');
    }
    
    const accessToken = tokenResponse.data.access_token;

    // Build query params
    const params = new URLSearchParams({ pan_number });
    if (name) {
      params.append('name', name);
    }

    // Call PAN verification API
    const verifyResponse = await fetch(`${DEEPVUE_PAN_URL}?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'x-api-key': clientSecret
      }
    });

    const result = await verifyResponse.json();

    return Response.json({
      success: verifyResponse.ok,
      statusCode: verifyResponse.status,
      data: result
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      success: false
    }, { status: 500 });
  }
});