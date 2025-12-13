import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get all scheduled notifications that are due
    const allNotifications = await base44.asServiceRole.entities.ScheduledNotification.filter({ status: 'scheduled' });
    
    const now = new Date();
    const dueNotifications = allNotifications.filter(n => {
      if (!n.scheduled_time) return false;
      const scheduledTime = new Date(n.scheduled_time);
      return scheduledTime <= now;
    });

    if (dueNotifications.length === 0) {
      return Response.json({ success: true, message: 'No due notifications', processed: 0 });
    }

    const results = [];

    for (const notification of dueNotifications) {
      try {
        // Get target employees
        const allEmployees = await base44.asServiceRole.entities.Employee.filter({ status: 'active' });
        let targetEmployees = [];

        if (notification.target_type === 'all') {
          targetEmployees = allEmployees;
        } else if (notification.target_type === 'department') {
          targetEmployees = allEmployees.filter(e => 
            e.department?.toLowerCase() === notification.target_value?.toLowerCase()
          );
        } else if (notification.target_type === 'designation') {
          targetEmployees = allEmployees.filter(e => 
            e.designation?.toLowerCase() === notification.target_value?.toLowerCase()
          );
        } else if (notification.target_type === 'specific') {
          targetEmployees = allEmployees.filter(e => 
            e.email?.toLowerCase() === notification.target_value?.toLowerCase()
          );
        }

        let inAppCount = 0;
        let emailCount = 0;
        let whatsappCount = 0;

        // Send in-app notifications
        if (notification.send_in_app) {
          for (const emp of targetEmployees) {
            try {
              await base44.asServiceRole.entities.Notification.create({
                recipient_email: emp.email,
                title: notification.title,
                message: notification.message,
                type: notification.notification_type || 'info',
                link: notification.link_url || undefined,
                is_read: false
              });
              inAppCount++;
              
              // Send push notification
              try {
                await base44.asServiceRole.functions.invoke('sendPushNotification', {
                  user_email: emp.email,
                  title: notification.title,
                  body: notification.message,
                  data: {
                    type: notification.notification_type || 'info',
                    link: notification.link_url || null
                  }
                });
              } catch (pushErr) {
                console.error('Push notification error:', pushErr);
              }
            } catch (err) {
              console.error('In-app notification error:', err);
            }
          }
        }

        // Send emails
        if (notification.send_email) {
          for (const emp of targetEmployees) {
            try {
              const emailBody = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <div style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 20px; border-radius: 8px 8px 0 0;">
                    <h2 style="color: white; margin: 0;">SaberTechs HRMS</h2>
                  </div>
                  <div style="padding: 20px; background: #fff; border: 1px solid #e5e7eb;">
                    <h3 style="color: #1f2937;">${notification.title}</h3>
                    <p style="color: #4b5563;">Dear ${emp.full_name},</p>
                    <p style="color: #4b5563;">${notification.message}</p>
                    ${notification.image_url ? `<img src="${notification.image_url}" style="max-width:300px;border-radius:8px;margin:10px 0;" />` : ''}
                    ${notification.link_url ? `<p><a href="${notification.link_url}" style="color: #4F46E5;">View Details</a></p>` : ''}
                  </div>
                  <div style="padding: 15px; background: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
                    <p style="color: #9ca3af; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} SaberTechs HRMS</p>
                  </div>
                </div>
              `;
              
              await base44.asServiceRole.integrations.Core.SendEmail({
                to: emp.email,
                subject: notification.title,
                body: emailBody
              });
              emailCount++;
            } catch (err) {
              console.error('Email error:', err);
            }
          }
        }

        // Send WhatsApp messages
        if (notification.send_whatsapp) {
          const instanceId = Deno.env.get("WHATSAPP_INSTANCE_ID");
          const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");

          if (instanceId && accessToken) {
            for (const emp of targetEmployees) {
              if (emp.phone) {
                try {
                  let phone = emp.phone.replace(/\D/g, '');
                  if (!phone.startsWith('91') && phone.length === 10) {
                    phone = '91' + phone;
                  }

                  const whatsappMessage = `*${notification.title}*\n\n${notification.message}${notification.link_url ? `\n\n🔗 ${notification.link_url}` : ''}`;

                  const payload = {
                    number: phone,
                    type: "text",
                    message: whatsappMessage,
                    instance_id: instanceId,
                    access_token: accessToken
                  };

                  const response = await fetch('https://web.saasyto.com/api/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                  });

                  if (response.ok) {
                    whatsappCount++;
                  }
                } catch (err) {
                  console.error('WhatsApp error:', err);
                }
              }
            }
          }
        }

        // Update notification status to sent
        await base44.asServiceRole.entities.ScheduledNotification.update(notification.id, {
          status: 'sent',
          sent_count: targetEmployees.length
        });

        results.push({
          id: notification.id,
          title: notification.title,
          targetCount: targetEmployees.length,
          inAppCount,
          emailCount,
          whatsappCount,
          status: 'sent'
        });

      } catch (err) {
        console.error('Error processing notification:', notification.id, err);
        results.push({
          id: notification.id,
          title: notification.title,
          status: 'error',
          error: err.message
        });
      }
    }

    return Response.json({ 
      success: true, 
      processed: results.length,
      results 
    });

  } catch (error) {
    console.error('Process scheduled notifications error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});