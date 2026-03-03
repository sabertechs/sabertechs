import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const DEEPVUE_PAN_PLUS_V2_URL = 'https://production.deepvue.tech/v1/verification/pan-plus-v2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pan_number } = await req.json();

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

    const params = new URLSearchParams({ pan_number });
    const fullUrl = `${DEEPVUE_PAN_PLUS_V2_URL}?${params.toString()}`;

    console.log('PAN Plus V2 Request:', { url: fullUrl, pan: pan_number });

    const verifyResponse = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'x-api-key': clientSecret
      }
    });

    const result = await verifyResponse.json();

    console.log('PAN Plus V2 Response:', { status: verifyResponse.status, data: result });

    if (!verifyResponse.ok) {
      return Response.json({
        success: false,
        statusCode: verifyResponse.status,
        error: result.message || result.detail || 'Verification failed',
        data: result
      });
    }

    const d = result.data || {};

    return Response.json({
      success: true,
      statusCode: verifyResponse.status,
      transaction_id: result.transaction_id,
      data: {
        pan_number: d.pan_number,
        full_name: d.full_name,
        full_name_split: d.full_name_split,
        masked_aadhaar: d.masked_aadhaar,
        dob: d.dob,
        gender: d.gender,
        email: d.email,
        phone_number: d.phone_number,
        aadhaar_linked: d.aadhaar_linked,
        category: d.category,
        address: d.address || null,
      },
      raw: result
    });

  } catch (error) {
    console.error('PAN Plus V2 Error:', error);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});