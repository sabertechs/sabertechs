import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import nodemailer from 'npm:nodemailer@6.9.7';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employee_name, employee_email, rejection_reason } = await req.json();

    if (!employee_name || !employee_email || !rejection_reason) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get app URL for registration link
    const origin = new URL(req.url).origin;
    const registrationUrl = `${origin}/#/Registration`;

    const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .alert-box { background: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .button { display: inline-block; background: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Document Review Required</h1>
    </div>
    <div class="content">
      <p>Dear <strong>${employee_name}</strong>,</p>
      
      <p>We have reviewed your submitted documents and require clarification or resubmission.</p>
      
      <div class="alert-box">
        <h3 style="margin-top: 0; color: #dc2626;">Rejection Reason:</h3>
        <p style="margin-bottom: 0;"><strong>${rejection_reason}</strong></p>
      </div>
      
      <p><strong>What you need to do:</strong></p>
      <ol>
        <li>Review the rejection reason mentioned above</li>
        <li>Prepare the correct/clear documents</li>
        <li>Login to complete your registration again with updated documents</li>
        <li>Ensure all documents are clear, legible, and accurate</li>
      </ol>
      
      <div style="text-align: center;">
        <a href="${registrationUrl}" class="button">Update Documents</a>
      </div>
      
      <p><strong>Important Guidelines:</strong></p>
      <ul>
        <li>All documents must be clear and readable</li>
        <li>Aadhaar and PAN details must match your application</li>
        <li>Upload high-quality scans or photos</li>
        <li>Ensure all information is visible and not cropped</li>
      </ul>
      
      <p>If you have any questions or need assistance, please contact the HR department immediately.</p>
      
      <p>Best regards,<br><strong>HR Team</strong><br>SaberTechs</p>
    </div>
    <div class="footer">
      <p>This is an automated email. Please do not reply to this message.</p>
    </div>
  </div>
</body>
</html>
    `;

    // Get email configuration from settings
    const settings = await base44.asServiceRole.entities.AppSettings.list();
    const emailConfigSetting = settings.find(s => s.setting_key === 'email_config');

    if (emailConfigSetting?.setting_value) {
      // Use custom SMTP configuration
      const config = emailConfigSetting.setting_value;
      
      const transporter = nodemailer.createTransport({
        host: config.smtp_host,
        port: parseInt(config.smtp_port),
        secure: false,
        auth: {
          user: config.smtp_user,
          pass: config.smtp_password,
        },
      });

      await transporter.sendMail({
        from: `"${config.from_name}" <${config.from_email}>`,
        to: employee_email,
        subject: '⚠️ SaberTechs - Document Review Required',
        html: emailBody,
      });
    } else {
      // Fallback to Base44's built-in email service
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: employee_email,
        subject: '⚠️ SaberTechs - Document Review Required',
        body: emailBody
      });
    }

    // Create in-app notification
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: employee_email,
      title: 'Documents Rejected - Action Required',
      message: `Your submitted documents have been rejected. Reason: ${rejection_reason}. Please resubmit correct documents.`,
      type: 'alert',
      is_read: false,
      link: '#/Registration'
    });

    return Response.json({ 
      success: true, 
      message: 'Rejection notification sent successfully' 
    });

  } catch (error) {
    console.error('Send rejection error:', error);
    return Response.json({ 
      error: error.message,
      success: false
    }, { status: 500 });
  }
});