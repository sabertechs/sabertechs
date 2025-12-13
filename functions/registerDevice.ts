import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { device_token, device_type, device_name } = await req.json();

    if (!device_token || !device_type) {
      return Response.json({ 
        error: 'device_token and device_type are required' 
      }, { status: 400 });
    }

    // Check if token already exists
    const existingTokens = await base44.entities.DeviceToken.filter({
      user_email: user.email,
      device_token: device_token
    });

    if (existingTokens.length > 0) {
      // Update existing token
      await base44.entities.DeviceToken.update(existingTokens[0].id, {
        is_active: true,
        last_used: new Date().toISOString(),
        device_name: device_name || existingTokens[0].device_name
      });

      return Response.json({
        success: true,
        message: 'Device token updated',
        token_id: existingTokens[0].id
      });
    }

    // Create new token
    const newToken = await base44.entities.DeviceToken.create({
      user_email: user.email,
      device_token: device_token,
      device_type: device_type,
      device_name: device_name || 'Unknown Device',
      is_active: true,
      last_used: new Date().toISOString()
    });

    return Response.json({
      success: true,
      message: 'Device registered successfully',
      token_id: newToken.id
    });

  } catch (error) {
    console.error('Register device error:', error);
    return Response.json({ 
      error: error.message || 'Failed to register device' 
    }, { status: 500 });
  }
});