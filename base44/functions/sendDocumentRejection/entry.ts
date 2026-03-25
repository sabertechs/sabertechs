import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employee_email, employee_name, rejected_documents } = await req.json();

    if (!employee_email || !employee_name || !rejected_documents) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create document list for email
    const docList = Object.entries(rejected_documents)
      .map(([docType, reason]) => {
        const docLabels = {
          aadhaar_document: 'Aadhaar Document',
          pan_document: 'PAN Document',
          education_certificates: 'Education Certificates',
          profile_photo: 'Profile Photo'
        };
        return `<li><strong>${docLabels[docType] || docType}:</strong> ${reason}</li>`;
      })
      .join('');

    // Get registration URL
    const origin = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/') || 'https://app.base44.app';
    const registrationUrl = `${origin}/Registration`;

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
    .alert-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .doc-list { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .doc-list ul { margin: 10px 0; padding-left: 20px; }
    .doc-list li { margin: 10px 0; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔍 Document Review Update</h1>
    </div>
    <div class="content">
      <p>Dear <strong>${employee_name}</strong>,</p>
      
      <div class="alert-box">
        <p><strong>⚠️ Action Required</strong></p>
        <p>Some of your submitted documents need to be resubmitted. Please review the reasons below and upload correct documents.</p>
      </div>

      <div class="doc-list">
        <h3>Documents Requiring Resubmission:</h3>
        <ul>
          ${docList}
        </ul>
      </div>

      <p><strong>Next Steps:</strong></p>
      <ol>
        <li>Click the button below to access the registration portal</li>
        <li>Review the rejection reasons carefully</li>
        <li>Upload the corrected documents</li>
        <li>Submit for review again</li>
      </ol>

      <div style="text-align: center;">
        <a href="${registrationUrl}" class="button">📝 Resubmit Documents</a>
      </div>

      <p style="margin-top: 30px;">If you have any questions or need assistance, please contact HR.</p>

      <p style="margin-top: 20px;">Best regards,<br><strong>HR Team</strong></p>

      <div class="footer">
        <p>This is an automated email. Please do not reply to this message.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

    await base44.integrations.Core.SendEmail({
      to: employee_email,
      subject: '⚠️ Document Resubmission Required - Action Needed',
      body: htmlBody
    });

    return Response.json({ 
      success: true, 
      message: 'Document rejection notification sent successfully' 
    });
  } catch (error) {
    console.error('Error sending document rejection:', error);
    return Response.json({ 
      error: 'Failed to send notification',
      details: error.message 
    }, { status: 500 });
  }
});