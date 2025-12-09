import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employee_name, employee_email } = await req.json();

    if (!employee_name || !employee_email) {
      return Response.json({ error: 'Employee name and email are required' }, { status: 400 });
    }

    // Get app URL for registration link
    const appId = Deno.env.get('BASE44_APP_ID');
    const registrationUrl = `https://${appId}.base44.app`;

    // Send invitation email
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: employee_email,
      subject: 'Welcome to SaberTechs - Complete Your Registration',
      body: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
    ul { padding-left: 20px; }
    li { margin: 8px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Welcome to SaberTechs!</h1>
    </div>
    <div class="content">
      <p>Dear <strong>${employee_name}</strong>,</p>
      
      <p>Congratulations! You have been invited to join <strong>SaberTechs</strong> as a permanent employee.</p>
      
      <p>To complete your onboarding, please follow these steps:</p>
      
      <ol>
        <li><strong>Create Your Account:</strong> Click the button below to register and set up your password</li>
        <li><strong>Complete Your Profile:</strong> Fill in your personal information, documents, and bank details</li>
        <li><strong>Upload Documents:</strong> Provide your Aadhaar, PAN, education certificates, and profile photo</li>
        <li><strong>Submit for Approval:</strong> Once completed, HR will review and approve your registration</li>
      </ol>
      
      <div style="text-align: center;">
        <a href="${registrationUrl}" class="button">Complete Registration</a>
      </div>
      
      <p><strong>Important:</strong></p>
      <ul>
        <li>Please complete your registration within 7 days</li>
        <li>Keep all your documents (Aadhaar, PAN, certificates) ready</li>
        <li>Ensure your bank account details are accurate for salary credit</li>
      </ul>
      
      <p>If you have any questions or need assistance, please contact the HR department.</p>
      
      <p>We look forward to having you on our team!</p>
      
      <p>Best regards,<br><strong>HR Team</strong><br>SaberTechs</p>
    </div>
    <div class="footer">
      <p>This is an automated email. Please do not reply to this message.</p>
    </div>
  </div>
</body>
</html>
      `
    });

    return Response.json({ 
      success: true, 
      message: 'Invitation sent successfully' 
    });

  } catch (error) {
    console.error('Send invite error:', error);
    return Response.json({ 
      error: error.message,
      success: false
    }, { status: 500 });
  }
});