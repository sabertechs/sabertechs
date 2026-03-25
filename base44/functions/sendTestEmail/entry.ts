import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import nodemailer from 'npm:nodemailer@6.9.8';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to, subject, body } = await req.json();

    // Fetch email configuration from AppSettings
    const settings = await base44.asServiceRole.entities.AppSettings.list();
    const emailConfig = settings.find(s => s.setting_key === 'email_config');

    if (emailConfig?.setting_value) {
      // Use custom SMTP configuration
      const config = emailConfig.setting_value;
      
      const transporter = nodemailer.createTransport({
        host: config.smtp_host,
        port: parseInt(config.smtp_port),
        secure: config.smtp_port === '465',
        auth: {
          user: config.smtp_user,
          pass: config.smtp_password,
        },
      });

      await transporter.sendMail({
        from: `"${config.from_name || 'SaberTechs HRMS'}" <${config.smtp_user}>`,
        to: to,
        subject: subject,
        html: body,
      });

      return Response.json({ 
        success: true, 
        message: 'Email sent successfully using custom SMTP',
        from: config.smtp_user 
      });
    } else {
      // Fallback to Base44's default email service
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: to,
        subject: subject,
        body: body
      });

      return Response.json({ 
        success: true, 
        message: 'Email sent using default service',
        from: 'no-reply@base44.apps.com'
      });
    }
  } catch (error) {
    console.error('Send test email error:', error);
    return Response.json({ 
      error: error.message || 'Failed to send email' 
    }, { status: 500 });
  }
});