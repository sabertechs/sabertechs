Deno.serve(async (req) => {
  const results = {
    steps: [],
    success: false,
    finalMessage: ""
  };

  const addStep = (step, status, message, data = null) => {
    results.steps.push({ step, status, message, data, timestamp: new Date().toISOString() });
  };

  try {
    // Step 1: Check credentials
    addStep(1, 'start', 'Checking environment variables...');
    const clientId = Deno.env.get('DEEPVUE_CLIENT_ID');
    const clientSecret = Deno.env.get('DEEPVUE_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      addStep(1, 'failed', 'Credentials not found in environment');
      results.finalMessage = 'API credentials not configured';
      return Response.json(results, { status: 500 });
    }

    addStep(1, 'success', 'Credentials found', {
      clientId: clientId.substring(0, 8) + '...',
      clientSecretLength: clientSecret.length
    });

    // Step 2: Test Authorization Endpoint with FormData
    addStep(2, 'start', 'Testing authorization endpoint with FormData...');
    const AUTH_URL = 'https://production.deepvue.tech/v1/authorize';
    
    const formData = new FormData();
    formData.append('client_id', clientId);
    formData.append('client_secret', clientSecret);

    addStep(2, 'info', 'Sending POST request with FormData', {
      url: AUTH_URL,
      method: 'POST',
      bodyType: 'FormData'
    });

    const authResponse = await fetch(AUTH_URL, {
      method: 'POST',
      body: formData
    });

    const authData = await authResponse.json();

    if (!authResponse.ok) {
      addStep(2, 'failed', `Authorization failed with status ${authResponse.status}`, {
        status: authResponse.status,
        statusText: authResponse.statusText,
        response: authData
      });
      results.finalMessage = `Auth failed: ${authData.detail || 'Unknown error'}`;
      return Response.json(results, { status: authResponse.status });
    }

    const accessToken = authData.access_token;
    
    if (!accessToken) {
      addStep(2, 'failed', 'No access token in response', authData);
      results.finalMessage = 'Invalid token response';
      return Response.json(results, { status: 500 });
    }

    addStep(2, 'success', 'Access token received', {
      tokenPrefix: accessToken.substring(0, 20) + '...',
      tokenType: authData.token_type,
      expiresIn: authData.expiry
    });

    // Step 3: Test PAN Verification Endpoint
    addStep(3, 'start', 'Testing PAN verification endpoint...');
    const TEST_PAN = 'BKMPS9943P';
    const PAN_URL = 'https://production.deepvue.tech/v1/verification/panbasic';
    
    const params = new URLSearchParams({ pan_number: TEST_PAN });
    const fullPanUrl = `${PAN_URL}?${params.toString()}`;

    addStep(3, 'info', 'Calling PAN API', {
      url: fullPanUrl,
      pan: TEST_PAN,
      method: 'GET'
    });

    const panResponse = await fetch(fullPanUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'x-api-key': clientSecret
      }
    });

    const panData = await panResponse.json();

    if (!panResponse.ok) {
      addStep(3, 'failed', `PAN verification failed with status ${panResponse.status}`, {
        status: panResponse.status,
        response: panData
      });
      results.finalMessage = `PAN API Error ${panResponse.status}: ${panData.message || 'Unknown error'}`;
      return Response.json(results, { status: panResponse.status });
    }

    addStep(3, 'success', 'PAN API responded successfully', {
      status: panResponse.status,
      response: panData
    });

    // Step 4: Summary
    addStep(4, 'success', 'All tests passed!', {
      message: 'Deepvue integration is working correctly'
    });

    results.success = true;
    results.finalMessage = 'Connection successful - All systems operational';
    
    return Response.json(results);

  } catch (error) {
    addStep('error', 'failed', 'Unexpected error occurred', {
      error: error.message,
      stack: error.stack
    });
    results.finalMessage = error.message;
    return Response.json(results, { status: 500 });
  }
});