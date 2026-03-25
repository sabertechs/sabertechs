import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const DEEPVUE_PAN_URL = 'https://production.deepvue.tech/v1/verification/panbasic';

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

    // Get access token
    const tokenResponse = await base44.asServiceRole.functions.invoke('getDeepvueToken', {});
    
    if (!tokenResponse.data.success) {
      throw new Error('Failed to get access token');
    }
    
    const accessToken = tokenResponse.data.access_token;

    // Build URL with query parameters
    const params = new URLSearchParams({ pan_number: pan_number });
    if (name) {
      params.append('name', name);
    }

    const fullUrl = `${DEEPVUE_PAN_URL}?${params.toString()}`;

    console.log('PAN Verification Request:', {
      url: fullUrl,
      pan: pan_number,
      hasName: !!name
    });

    // GET request with Bearer token and x-api-key
    const verifyResponse = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'x-api-key': clientSecret
      }
    });

    const result = await verifyResponse.json();

    console.log('PAN Verification Response:', {
      status: verifyResponse.status,
      data: result
    });

    if (!verifyResponse.ok) {
      return Response.json({
        success: false,
        statusCode: verifyResponse.status,
        error: result.message || result.detail || 'Verification failed',
        data: result
      });
    }

    return Response.json({
      success: true,
      statusCode: verifyResponse.status,
      data: result
    });

  } catch (error) {
    console.error('PAN Verification Error:', error);
    return Response.json({ 
      error: error.message,
      success: false
    }, { status: 500 });
  }
});