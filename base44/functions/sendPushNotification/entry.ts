import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only HR/Admin can send push notifications
    if (!user || (user.role !== 'admin')) {
      const employees = await base44.asServiceRole.entities.Employee.filter({ 
        email: user?.email 
      });
      if (!employees[0] || !['hr', 'manager', 'department_head'].includes(employees[0].role)) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const { 
      user_email, 
      title, 
      body, 
      data = {} 
    } = await req.json();

    if (!user_email || !title || !body) {
      return Response.json({ 
        error: 'user_email, title, and body are required' 
      }, { status: 400 });
    }

    // Get FCM server key from environment
    const fcmServerKey = Deno.env.get('FCM_SERVER_KEY');
    if (!fcmServerKey) {
      return Response.json({ 
        error: 'FCM_SERVER_KEY not configured' 
      }, { status: 500 });
    }

    // Get active device tokens for user
    const deviceTokens = await base44.asServiceRole.entities.DeviceToken.filter({
      user_email: user_email,
      is_active: true
    });

    if (deviceTokens.length === 0) {
      return Response.json({ 
        success: false,
        message: 'No active devices found for user' 
      });
    }

    const results = [];

    // Send notification to each device
    for (const device of deviceTokens) {
      try {
        const fcmPayload = {
          to: device.device_token,
          notification: {
            title: title,
            body: body,
            sound: 'default',
            badge: 1
          },
          data: {
            ...data,
            click_action: 'FLUTTER_NOTIFICATION_CLICK'
          },
          priority: 'high'
        };

        const response = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Authorization': `key=${fcmServerKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(fcmPayload)
        });

        const result = await response.json();

        if (result.success === 1) {
          // Update last_used timestamp
          await base44.asServiceRole.entities.DeviceToken.update(device.id, {
            last_used: new Date().toISOString()
          });

          results.push({
            device_id: device.id,
            success: true
          });
        } else {
          // If token is invalid, mark as inactive
          if (result.results?.[0]?.error === 'InvalidRegistration' || 
              result.results?.[0]?.error === 'NotRegistered') {
            await base44.asServiceRole.entities.DeviceToken.update(device.id, {
              is_active: false
            });
          }

          results.push({
            device_id: device.id,
            success: false,
            error: result.results?.[0]?.error || 'Unknown error'
          });
        }
      } catch (error) {
        results.push({
          device_id: device.id,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return Response.json({
      success: true,
      message: `Notification sent to ${successCount}/${deviceTokens.length} devices`,
      results: results
    });

  } catch (error) {
    console.error('Send push notification error:', error);
    return Response.json({ 
      error: error.message || 'Failed to send notification' 
    }, { status: 500 });
  }
});