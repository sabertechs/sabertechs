import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import JSZip from 'npm:jszip@3.10.1';
import { format } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { employeeId } = await req.json();
        
        if (!employeeId) {
            return Response.json({ error: 'Employee ID required' }, { status: 400 });
        }

        // Fetch employee data
        const employees = await base44.entities.Employee.filter({ id: employeeId });
        if (employees.length === 0) {
            return Response.json({ error: 'Employee not found' }, { status: 404 });
        }
        
        const emp = employees[0];
        
        // Fetch offer letter if exists
        const offerLetters = await base44.entities.OfferLetter.filter({ employee_email: emp.email });
        const offerLetter = offerLetters.length > 0 ? offerLetters[0] : null;

        const folderName = emp.email?.replace('@', '_at_').replace(/\./g, '_');
        
        // Generate HTML content for each document
        const offerLetterHTML = generateOfferLetterHTML(emp, offerLetter);
        const bgvReportHTML = generateBGVHTML(emp);
        const policyHTML = generatePolicyHTML(emp);

        // Create ZIP file
        const zip = new JSZip();
        const folder = zip.folder(folderName);
        
        folder.file('Offer_Letter.html', offerLetterHTML);
        folder.file('BGV_Report.html', bgvReportHTML);
        folder.file('Policy_Agreement.html', policyHTML);

        const zipBlob = await zip.generateAsync({ type: 'arraybuffer' });
        
        return new Response(zipBlob, {
            status: 200,
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${folderName}_documents.zip"`
            }
        });
    } catch (error) {
        console.error('ZIP generation error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});

function generateOfferLetterHTML(emp, offerLetter) {
    const headerImg = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6925679300b99789588899b7/ab1b508e1_image002.jpg";
    const footerImg = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6925679300b99789588899b7/9fddeba2e_image001.jpg";
    const currentDate = format(new Date(), 'MMMM d, yyyy');
    const joiningDate = emp.date_of_joining && !isNaN(new Date(emp.date_of_joining).getTime()) 
        ? format(new Date(emp.date_of_joining), 'MMMM d, yyyy') 
        : 'the date of joining';
    
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Appointment Letter - ${emp.full_name}</title>
  <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&display=swap" rel="stylesheet">
  <style>
    @page { margin: 0; }
    body { font-family: 'Times New Roman', Times, serif; margin: 0; padding: 0; font-size: 12pt; line-height: 1.5; }
    .header { width: 100%; text-align: center; }
    .header img { width: 100%; max-height: 120px; object-fit: contain; }
    .footer { width: 100%; position: fixed; bottom: 0; text-align: center; }
    .footer img { width: 100%; max-height: 80px; object-fit: contain; }
    .content { padding: 20px 60px; min-height: calc(100vh - 250px); }
    .date { text-align: right; margin-bottom: 20px; }
    .subject { text-align: center; font-weight: bold; text-decoration: underline; margin: 20px 0; }
    .salutation { margin: 20px 0; }
    p { text-align: justify; margin: 10px 0; }
    .terms { margin: 20px 0; }
    .terms ol { margin-left: 20px; }
    .terms li { margin: 8px 0; text-align: justify; }
    .signature { margin-top: 40px; }
    .employee-name { font-weight: bold; }
    .digital-signature {
      position: fixed;
      bottom: 100px;
      right: 60px;
      text-align: right;
      font-family: 'Dancing Script', cursive;
      font-size: 17pt;
      color: #1a365d;
    }
    .print-btn { display: block; margin: 20px auto; padding: 10px 30px; background: #4f46e5; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; }
    @media print { .print-btn { display: none; } }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
  <div class="header">
    <img src="${headerImg}" alt="Company Header" />
  </div>
  <div class="content">
    <p class="date">Date: ${currentDate}</p>
    <p class="subject">APPOINTMENT LETTER</p>
    <p class="salutation">Dear <span class="employee-name">${emp.full_name}</span>,</p>
    <p>With reference to your application and subsequent interview, we are pleased to appoint you as <strong>${emp.designation || offerLetter?.designation || 'Employee'}</strong> in our organization with effect from <strong>${joiningDate}</strong>.</p>
    <p>Your appointment is subject to the following terms and conditions:</p>
    <div class="terms">
      <ol>
        <li><strong>Designation:</strong> You will be designated as ${emp.designation || offerLetter?.designation || 'Employee'} in the ${emp.department || offerLetter?.department || 'Company'}.</li>
        <li><strong>Salary:</strong> Your gross salary will be ₹${(emp.salary || offerLetter?.salary || 0).toLocaleString()} per month. The salary structure and other benefits will be as per company policy.</li>
        <li><strong>Probation Period:</strong> You will be on probation for a period of six months from the date of joining. During this period, either party can terminate the employment by giving 15 days' notice or salary in lieu thereof.</li>
        <li><strong>Working Hours:</strong> You will be required to work as per the company's standard working hours and follow all rules and regulations of the company.</li>
        <li><strong>Confidentiality:</strong> You shall maintain strict confidentiality regarding all company matters, trade secrets, and proprietary information both during and after your employment.</li>
        <li><strong>Notice Period:</strong> After confirmation, either party may terminate the employment by giving one month's notice or salary in lieu thereof.</li>
        <li><strong>Other Terms:</strong> You will be governed by all other terms and conditions as applicable to employees of your grade as per company policy from time to time.</li>
      </ol>
    </div>
    <p>We are confident that you will contribute positively to the growth of the organization. Please sign the duplicate copy of this letter as a token of your acceptance of the above terms and conditions.</p>
    <p>We welcome you to our organization and wish you a successful career with us.</p>
    <div class="signature">
      <p>Yours sincerely,</p>
      <p><strong>For Saber Technologies Pvt. Ltd.</strong></p>
      <br/><br/>
      <p>Authorized Signatory</p>
    </div>
  </div>
  <div class="footer">
    <img src="${footerImg}" alt="Company Footer" />
  </div>
  <div class="digital-signature">${emp.full_name}</div>
</body>
</html>`;
}

function generateBGVHTML(emp) {
    const logoImg = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6925679300b99789588899b7/ab1b508e1_image002.jpg";
    const verificationDate = format(new Date(), 'dd-MM-yyyy');
    const verificationTime = format(new Date(), 'hh:mm a');
    
    const calculateAge = (dob) => {
        if (!dob) return 'N/A';
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
        return age;
    };

    const age = calculateAge(emp.date_of_birth);
    const ageBand = age !== 'N/A' ? `${Math.floor(age/10)*10}-${Math.floor(age/10)*10 + 10}` : 'N/A';
    const maskedAadhaar = emp.aadhaar_number ? 'XXXXXXXX' + emp.aadhaar_number.slice(-4) : 'N/A';
    const genderShort = emp.gender === 'male' ? 'M' : emp.gender === 'female' ? 'F' : 'O';
    const fullAddress = [emp.address, emp.locality, emp.city, emp.state, emp.pincode].filter(Boolean).join(', ') || 'N/A';
    const bgvStatus = emp.bg_verification_status === 'approved' ? 'Success' : emp.bg_verification_status === 'rejected' ? 'Failed' : 'Pending';
    const statusColor = emp.bg_verification_status === 'approved' ? '#7cb342' : emp.bg_verification_status === 'rejected' ? '#e53935' : '#ffa000';
    
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Background Verification - ${emp.full_name}</title>
  <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&display=swap" rel="stylesheet">
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #333; }
    .page { width: 210mm; min-height: 297mm; padding: 0; margin: 0 auto; background: white; page-break-after: always; position: relative; }
    .page:last-child { page-break-after: auto; }
    .digital-signature { position: absolute; bottom: 30px; right: 30px; text-align: right; font-family: 'Dancing Script', cursive; font-size: 17pt; color: #1a365d; }
    .logo-header { text-align: center; padding: 15px 0; }
    .logo-header img { height: 60px; }
    .title-bar { background: #f57c00; color: white; text-align: center; padding: 15px; font-size: 20px; font-weight: bold; letter-spacing: 1px; }
    .profile-section { display: flex; padding: 20px 30px; border: 1px solid #e0e0e0; margin: 20px 30px; border-radius: 8px; }
    .profile-photo { width: 120px; height: 140px; background: #e0e0e0; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 30px; overflow: hidden; }
    .profile-photo img { width: 100%; height: 100%; object-fit: cover; }
    .profile-info { flex: 1; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .info-item { margin: 5px 0; }
    .info-label { color: #666; font-size: 11px; }
    .info-value { font-weight: bold; font-size: 13px; }
    .name-section { margin-top: 15px; }
    .emp-name { font-size: 18px; font-weight: bold; }
    .emp-id { color: #666; font-size: 11px; margin-top: 3px; }
    .status-bar { display: flex; justify-content: space-around; padding: 15px 30px; background: #f5f5f5; margin: 0 30px; border-radius: 8px; }
    .status-item { text-align: center; }
    .status-label { color: #666; font-size: 11px; }
    .status-value { font-size: 16px; font-weight: bold; margin-top: 5px; }
    .verification-table { margin: 20px 30px; border-collapse: collapse; width: calc(100% - 60px); }
    .verification-table th, .verification-table td { border: 1px solid #e0e0e0; padding: 12px 15px; text-align: left; }
    .verification-table th { background: #f5f5f5; font-weight: bold; color: #333; }
    .verification-table td.success { color: #7cb342; font-weight: bold; }
    .verification-table td.pending { color: #ffa000; font-weight: bold; }
    .verification-table td.failed { color: #e53935; font-weight: bold; }
    .report-title { background: #8bc34a; color: white; text-align: center; padding: 15px; font-size: 18px; font-weight: bold; }
    .section-title { background: #f5f5f5; padding: 10px 15px; font-weight: bold; margin: 20px 30px 0; border-left: 4px solid #f57c00; }
    .data-table { margin: 0 30px 20px; border-collapse: collapse; width: calc(100% - 60px); }
    .data-table td { border: 1px solid #e0e0e0; padding: 12px 15px; }
    .data-table td:first-child { background: #fafafa; font-weight: bold; width: 40%; }
    .result-row { background: #8bc34a !important; }
    .result-row td { color: white !important; font-weight: bold !important; }
    .result-row td:first-child { background: #8bc34a !important; }
    .print-btn { display: block; margin: 20px auto; padding: 10px 30px; background: #4f46e5; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; }
    @media print { .print-btn { display: none; } }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
  <div class="page">
    <div class="logo-header"><img src="${logoImg}" alt="Saber Technologies" /></div>
    <div class="title-bar">VERIFICATIONS SUMMARY</div>
    <div class="profile-section">
      <div class="profile-photo">
        ${emp.profile_photo ? `<img src="${emp.profile_photo}" alt="Profile" />` : `<span style="color:#999;font-size:40px;">${emp.full_name?.[0] || 'E'}</span>`}
      </div>
      <div class="profile-info">
        <div class="info-grid">
          <div class="info-item"><div class="info-label">Staff ID</div><div class="info-value">${emp.employee_id || emp.id || 'N/A'}</div></div>
          <div class="info-item"><div class="info-label">Mobile</div><div class="info-value">${emp.phone || 'N/A'}</div></div>
          <div class="info-item"><div class="info-label">Date of Birth</div><div class="info-value">${emp.date_of_birth && !isNaN(new Date(emp.date_of_birth).getTime()) ? format(new Date(emp.date_of_birth), 'dd-MM-yyyy') : 'N/A'}</div></div>
          <div class="info-item"><div class="info-label">Father's/Guardian's name</div><div class="info-value">${emp.father_name || 'N/A'}</div></div>
          <div class="info-item"><div class="info-label">Current Address</div><div class="info-value">${fullAddress}</div></div>
          <div class="info-item"><div class="info-label">Permanent Address</div><div class="info-value">${fullAddress}</div></div>
        </div>
        <div class="name-section">
          <div class="emp-name">${emp.full_name}</div>
          <div class="emp-id">Individual ID ${emp.employee_id || emp.id || 'N/A'}</div>
        </div>
      </div>
    </div>
    <div class="status-bar">
      <div class="status-item"><div class="status-label">Overall Status</div><div class="status-value" style="color: ${statusColor}">${bgvStatus}</div></div>
      <div class="status-item"><div class="status-label">Initiation Date</div><div class="status-value">${verificationDate}</div></div>
    </div>
    <table class="verification-table">
      <thead><tr><th>Verifications</th><th>Created Date</th><th>Updated Date</th><th>Status</th></tr></thead>
      <tbody>
        <tr><td>Aadhaar Verification</td><td>${verificationDate}</td><td>${verificationDate}</td><td class="${emp.bg_verification_status === 'approved' ? 'success' : emp.bg_verification_status === 'rejected' ? 'failed' : 'pending'}">${bgvStatus}</td></tr>
        <tr><td>PAN Card Verification</td><td>${verificationDate}</td><td>${verificationDate}</td><td class="${emp.bg_verification_status === 'approved' ? 'success' : emp.bg_verification_status === 'rejected' ? 'failed' : 'pending'}">${bgvStatus}</td></tr>
      </tbody>
    </table>
    <div class="digital-signature">${emp.full_name}</div>
  </div>
  
  <div class="page">
    <div class="logo-header"><img src="${logoImg}" alt="Saber Technologies" /></div>
    <div class="report-title">AADHAAR VERIFICATION REPORT</div>
    <div class="section-title">GIVEN INFORMATION</div>
    <table class="data-table">
      <tr><td>AADHAAR NUMBER</td><td>${emp.aadhaar_number || 'N/A'}</td></tr>
      <tr><td>LOCATION</td><td>${emp.state || 'N/A'}</td></tr>
      <tr><td>GENDER</td><td>${emp.gender ? emp.gender.charAt(0).toUpperCase() + emp.gender.slice(1) : 'N/A'}</td></tr>
      <tr><td>AGE</td><td>${age}</td></tr>
    </table>
    <div class="section-title">VERIFIED INFORMATION*</div>
    <table class="data-table">
      <tr><td>AADHAAR NUMBER</td><td>${maskedAadhaar}</td></tr>
      <tr><td>GENDER</td><td>${genderShort}</td></tr>
      <tr><td>STATE</td><td>${emp.state || 'N/A'}</td></tr>
      <tr><td>AGE BAND</td><td>${ageBand}</td></tr>
    </table>
    <table class="data-table">
      <tr class="result-row"><td>RESULT</td><td>${bgvStatus}</td></tr>
      <tr><td>DATE OF VERIFICATION</td><td>${verificationDate}</td></tr>
      <tr><td>TIME OF VERIFICATION</td><td>${verificationTime}</td></tr>
    </table>
    <div class="digital-signature">${emp.full_name}</div>
  </div>
  
  <div class="page">
    <div class="logo-header"><img src="${logoImg}" alt="Saber Technologies" /></div>
    <div class="report-title">PAN CARD VERIFICATION REPORT</div>
    <div class="section-title">GIVEN INFORMATION</div>
    <table class="data-table">
      <tr><td>NAME ON PAN CARD</td><td>${emp.full_name}</td></tr>
      <tr><td>PAN NUMBER</td><td>${emp.pan_number || 'N/A'}</td></tr>
      <tr><td>DATE OF BIRTH</td><td>${emp.date_of_birth && !isNaN(new Date(emp.date_of_birth).getTime()) ? format(new Date(emp.date_of_birth), 'dd-MM-yyyy') : 'N/A'}</td></tr>
    </table>
    <div class="section-title">VERIFIED INFORMATION*</div>
    <table class="data-table">
      <tr><td>PAN NUMBER</td><td>${emp.pan_number || 'N/A'}</td></tr>
      <tr><td>NAME</td><td>${emp.full_name?.toUpperCase()}</td></tr>
      <tr><td>CATEGORY</td><td>Individual</td></tr>
    </table>
    <table class="data-table">
      <tr class="result-row"><td>RESULT</td><td>${bgvStatus}</td></tr>
      <tr><td>DATE OF VERIFICATION</td><td>${verificationDate}</td></tr>
      <tr><td>TIME OF VERIFICATION</td><td>${verificationTime}</td></tr>
    </table>
    <div class="digital-signature">${emp.full_name}</div>
  </div>
</body>
</html>`;
}

function generatePolicyHTML(emp) {
    const policyImages = [
        'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6925679300b99789588899b7/26ed80578_Screenshot2025-11-28at14140PM.png',
        'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6925679300b99789588899b7/fca4f55f8_2.png',
        'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6925679300b99789588899b7/be4a967d7_3.png',
        'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6925679300b99789588899b7/9b90d22fd_4.png',
        'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6925679300b99789588899b7/da075ad19_5.png',
        'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6925679300b99789588899b7/a6348a5ee_6.png'
    ];
    
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Policy Agreement - ${emp.full_name}</title>
  <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&display=swap" rel="stylesheet">
  <style>
    @page { size: A4; margin: 0; }
    @media print { .no-print { display: none !important; } .page { page-break-after: always; } .page:last-child { page-break-after: auto; } }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; background: #f5f5f5; }
    .instructions { background: #f0f4f8; padding: 20px; margin: 20px; border-radius: 8px; border-left: 4px solid #4f46e5; }
    .instructions h2 { color: #1e293b; margin-bottom: 10px; }
    .instructions p { color: #64748b; margin: 5px 0; }
    .print-btn { background: #4f46e5; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-size: 14px; margin-top: 15px; }
    .print-btn:hover { background: #4338ca; }
    .page { width: 210mm; min-height: 297mm; background: white; margin: 20px auto; position: relative; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .page img { width: 100%; height: auto; display: block; }
    .signature-block { position: absolute; bottom: 30px; right: 40px; text-align: right; }
    .signature-name { font-family: 'Dancing Script', cursive; font-size: 17pt; color: #1a365d; }
  </style>
</head>
<body>
  <div class="instructions no-print">
    <h2>Policy Agreement for: ${emp.full_name}</h2>
    <p>This document contains the Policy for Proctor/Assessors with employee signature.</p>
    <p>Click the button below to print or save as PDF.</p>
    <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
  </div>
  ${policyImages.map((img, index) => `
  <div class="page">
    <img src="${img}" alt="Policy Page ${index + 1}" />
    <div class="signature-block">
      <div class="signature-name">${emp.full_name}</div>
    </div>
  </div>
  `).join('')}
</body>
</html>`;
}