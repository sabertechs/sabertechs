// Professional Email Template for SaberTechs HRMS
// Use this function to wrap email content in a branded template

export const getEmailTemplate = ({ 
  title, 
  recipientName, 
  content, 
  ctaButton = null, // { text: "View Details", url: "https://..." }
  footerNote = null 
}) => {
  const companyName = "SaberTechs";
  const companyLogo = "https://base44.app/api/apps/6925679300b99789588899b7/files/public/6925679300b99789588899b7/a110f61be_saber.png";
  const primaryColor = "#4F46E5"; // Indigo
  const currentYear = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">
          
          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, ${primaryColor} 0%, #7C3AED 100%); padding: 30px 40px; border-radius: 16px 16px 0 0;">
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td>
                    <img src="${companyLogo}" alt="${companyName}" style="height: 50px; width: auto; border-radius: 8px;" />
                  </td>
                  <td align="right">
                    <span style="color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">${companyName}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="background-color: #ffffff; padding: 40px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
              
              <!-- Title -->
              <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 700; color: #1f2937; line-height: 1.3;">
                ${title}
              </h1>
              
              <!-- Greeting -->
              ${recipientName ? `
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151; line-height: 1.6;">
                Dear <strong>${recipientName}</strong>,
              </p>
              ` : ''}
              
              <!-- Content -->
              <div style="font-size: 16px; color: #4b5563; line-height: 1.7;">
                ${content}
              </div>
              
              <!-- CTA Button -->
              ${ctaButton ? `
              <table role="presentation" style="width: 100%; margin-top: 32px;">
                <tr>
                  <td align="center">
                    <a href="${ctaButton.url}" style="display: inline-block; background: linear-gradient(135deg, ${primaryColor} 0%, #7C3AED 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.4);">
                      ${ctaButton.text}
                    </a>
                  </td>
                </tr>
              </table>
              ` : ''}
              
              <!-- Footer Note -->
              ${footerNote ? `
              <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                  ${footerNote}
                </p>
              </div>
              ` : ''}
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px 40px; border-radius: 0 0 16px 16px; border: 1px solid #e5e7eb; border-top: none;">
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">
                      This email was sent by <strong style="color: #4b5563;">${companyName} HRMS</strong>
                    </p>
                    <p style="margin: 0 0 16px 0; font-size: 13px; color: #9ca3af;">
                      © ${currentYear} ${companyName}. All rights reserved.
                    </p>
                    <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 8px;">
                      <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                        If you have any questions, please contact HR at <a href="mailto:hr@sabertechs.com" style="color: ${primaryColor}; text-decoration: none;">hr@sabertechs.com</a>
                      </p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};

// Pre-built email templates for common use cases

export const getNotificationEmail = ({ recipientName, title, message, link = null }) => {
  return getEmailTemplate({
    title,
    recipientName,
    content: `<p style="margin: 0;">${message}</p>`,
    ctaButton: link ? { text: "View Details", url: link } : null,
    footerNote: "This is an automated notification from the HRMS portal."
  });
};

export const getOfferLetterEmail = ({ recipientName, designation, department, joiningDate, salary }) => {
  return getEmailTemplate({
    title: "🎉 Congratulations! Your Offer Letter",
    recipientName,
    content: `
      <p style="margin: 0 0 16px 0;">
        We are pleased to inform you that you have been selected for the position at <strong>SaberTechs</strong>. 
        Please find the details of your offer below:
      </p>
      <table role="presentation" style="width: 100%; background-color: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
            <span style="color: #6b7280; font-size: 14px;">Position</span><br/>
            <strong style="color: #1f2937; font-size: 16px;">${designation}</strong>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
            <span style="color: #6b7280; font-size: 14px;">Department</span><br/>
            <strong style="color: #1f2937; font-size: 16px;">${department}</strong>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
            <span style="color: #6b7280; font-size: 14px;">Joining Date</span><br/>
            <strong style="color: #1f2937; font-size: 16px;">${joiningDate}</strong>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 16px;">
            <span style="color: #6b7280; font-size: 14px;">Annual CTC</span><br/>
            <strong style="color: #059669; font-size: 18px;">₹${salary?.toLocaleString()}</strong>
          </td>
        </tr>
      </table>
      <p style="margin: 0;">
        Please log in to the HRMS portal to view and download your complete offer letter.
      </p>
    `,
    ctaButton: { text: "View Offer Letter", url: "https://sabertechs.base44.app" },
    footerNote: "Please respond to this offer within 7 days. If you have any questions, contact our HR team."
  });
};

export const getBGVStatusEmail = ({ recipientName, status, remarks = null }) => {
  const statusColors = {
    approved: "#059669",
    rejected: "#DC2626",
    pending: "#D97706"
  };
  
  const statusMessages = {
    approved: "Your background verification has been <strong style='color: #059669;'>successfully completed and approved</strong>.",
    rejected: "Unfortunately, your background verification has been <strong style='color: #DC2626;'>not approved</strong>.",
    pending: "Your background verification is currently <strong style='color: #D97706;'>in progress</strong>."
  };

  return getEmailTemplate({
    title: `Background Verification ${status.charAt(0).toUpperCase() + status.slice(1)}`,
    recipientName,
    content: `
      <p style="margin: 0 0 16px 0;">
        ${statusMessages[status] || statusMessages.pending}
      </p>
      ${remarks ? `
      <div style="background-color: #fef3c7; border-left: 4px solid #D97706; padding: 16px; border-radius: 0 8px 8px 0; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px; color: #92400e;">
          <strong>Remarks:</strong> ${remarks}
        </p>
      </div>
      ` : ''}
      <p style="margin: 0;">
        For more details, please log in to the HRMS portal or contact the HR department.
      </p>
    `,
    ctaButton: { text: "View Details", url: "https://sabertechs.base44.app" },
    footerNote: "This is an official communication regarding your employment verification."
  });
};

export const getExpenseStatusEmail = ({ recipientName, expenseType, amount, status, remarks = null }) => {
  const statusColors = {
    approved: "#059669",
    rejected: "#DC2626"
  };
  
  return getEmailTemplate({
    title: `Expense Claim ${status.charAt(0).toUpperCase() + status.slice(1)}`,
    recipientName,
    content: `
      <p style="margin: 0 0 16px 0;">
        Your expense claim has been <strong style="color: ${statusColors[status]};">${status}</strong>.
      </p>
      <table role="presentation" style="width: 100%; background-color: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
            <span style="color: #6b7280; font-size: 14px;">Expense Type</span><br/>
            <strong style="color: #1f2937; font-size: 16px; text-transform: capitalize;">${expenseType?.replace('_', ' ')}</strong>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 16px;">
            <span style="color: #6b7280; font-size: 14px;">Amount</span><br/>
            <strong style="color: #1f2937; font-size: 18px;">₹${amount?.toLocaleString()}</strong>
          </td>
        </tr>
      </table>
      ${remarks ? `
      <div style="background-color: ${status === 'rejected' ? '#fef2f2' : '#f0fdf4'}; border-left: 4px solid ${statusColors[status]}; padding: 16px; border-radius: 0 8px 8px 0; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px; color: ${status === 'rejected' ? '#991b1b' : '#166534'};">
          <strong>Remarks:</strong> ${remarks}
        </p>
      </div>
      ` : ''}
    `,
    ctaButton: { text: "View Expenses", url: "https://sabertechs.base44.app" },
    footerNote: status === 'approved' ? "The approved amount will be credited to your account soon." : null
  });
};

export const getPayslipEmail = ({ recipientName, month, year, netSalary }) => {
  return getEmailTemplate({
    title: `💰 Payslip for ${month} ${year}`,
    recipientName,
    content: `
      <p style="margin: 0 0 16px 0;">
        Your payslip for <strong>${month} ${year}</strong> is now available.
      </p>
      <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); border-radius: 12px; padding: 24px; margin: 20px 0; text-align: center;">
        <p style="margin: 0 0 8px 0; color: #d1fae5; font-size: 14px;">Net Salary</p>
        <p style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;">₹${netSalary?.toLocaleString()}</p>
      </div>
      <p style="margin: 0;">
        Log in to the HRMS portal to view the complete breakdown and download your payslip.
      </p>
    `,
    ctaButton: { text: "Download Payslip", url: "https://sabertechs.base44.app" },
    footerNote: "The salary has been credited to your registered bank account."
  });
};

export const getOnboardingEmail = ({ recipientName, status, tasks = [] }) => {
  const statusMessages = {
    not_started: "Your onboarding process is about to begin.",
    in_progress: "Your onboarding is in progress. Please complete the pending tasks.",
    completed: "Congratulations! Your onboarding has been completed successfully."
  };

  return getEmailTemplate({
    title: status === 'completed' ? "✅ Onboarding Complete!" : "📋 Onboarding Update",
    recipientName,
    content: `
      <p style="margin: 0 0 16px 0;">
        ${statusMessages[status] || statusMessages.in_progress}
      </p>
      ${tasks.length > 0 ? `
      <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <p style="margin: 0 0 12px 0; font-weight: 600; color: #1f2937;">Pending Tasks:</p>
        <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
          ${tasks.map(task => `<li style="margin-bottom: 8px;">${task}</li>`).join('')}
        </ul>
      </div>
      ` : ''}
      <p style="margin: 0;">
        Please log in to the HRMS portal to view your complete onboarding checklist.
      </p>
    `,
    ctaButton: { text: "View Onboarding", url: "https://sabertechs.base44.app" },
    footerNote: "If you need any assistance, please reach out to the HR team."
  });
};