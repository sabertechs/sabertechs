import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { jsPDF } from 'npm:jspdf@2.5.2';

/**
 * Generates a payslip PDF and emails it to the employee.
 * Can be triggered by entity automation (Payslip create) or called directly with { payslip_id }.
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json();

        let payslip;

        // Entity automation payload
        if (body.event && body.data) {
            payslip = body.data;
        } else if (body.payslip_id) {
            const records = await base44.asServiceRole.entities.Payslip.filter({ id: body.payslip_id });
            if (records.length === 0) return Response.json({ error: 'Payslip not found' }, { status: 404 });
            payslip = records[0];
        } else {
            return Response.json({ error: 'Missing payslip data or payslip_id' }, { status: 400 });
        }

        const {
            employee_name,
            employee_email,
            employee_id,
            month,
            year,
            basic_salary = 0,
            hra = 0,
            da = 0,
            other_allowances = 0,
            gross_salary = 0,
            pf_deduction = 0,
            tax_deduction = 0,
            other_deductions = 0,
            net_salary = 0,
            payment_status = 'pending',
        } = payslip;

        if (!employee_email) {
            return Response.json({ error: 'Employee email missing from payslip' }, { status: 400 });
        }

        const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        const monthName = monthNames[parseInt(month, 10) - 1] || month;
        const totalDeductions = pf_deduction + tax_deduction + other_deductions;

        // ---- Fetch company logo as base64 ----
        const logoUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6925679300b99789588899b7/ab1b508e1_image002.jpg';
        let logoBase64 = null;
        try {
            const logoRes = await fetch(logoUrl);
            const logoBuffer = await logoRes.arrayBuffer();
            const logoBytes = new Uint8Array(logoBuffer);
            let binary = '';
            logoBytes.forEach(b => binary += String.fromCharCode(b));
            logoBase64 = 'data:image/jpeg;base64,' + btoa(binary);
        } catch (_) { /* skip logo if fetch fails */ }

        // ---- Generate PDF ----
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        const pageW = 210;
        const margin = 14;
        const contentW = pageW - margin * 2;
        const fmt = (n) => Number(n).toLocaleString('en-IN');
        let y = 10;

        const payableMonthlySpecial = da + other_allowances;

        // Fetch employee record for extra fields
        let empRecord = {};
        try {
            const emps = await base44.asServiceRole.entities.Employee.filter({ email: employee_email });
            if (emps.length > 0) empRecord = emps[0];
        } catch (_) {}

        // ── 1. LOGO centered ──
        if (logoBase64) {
            const logoW = 40; const logoH = 20;
            doc.addImage(logoBase64, 'JPEG', (pageW - logoW) / 2, y, logoW, logoH);
            y += logoH + 4;
        }

        // ── 2. Company name & address ──
        doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(0, 0, 0);
        doc.text('Saber Technologies Pvt. Ltd.', pageW / 2, y, { align: 'center' });
        y += 5;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(60, 60, 60);
        doc.text('Registered Office: Pkt-3, 4th Floor, Plot No.13, Block -B, Sector 17, Dwarka, Southwest Delhi, Delhi, 110075', pageW / 2, y, { align: 'center' });
        y += 4.5;
        doc.text('Branch Office: Ground Floor, Plot No. A-18, Sector-16, NOIDA, Gautam Buddha Nagar, Uttar Pradesh - 201301', pageW / 2, y, { align: 'center' });
        y += 7;

        // ── 3. Payslip header bar ──
        doc.setDrawColor(0); doc.setLineWidth(0.4);
        doc.rect(margin, y, contentW, 8);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(0, 0, 0);
        doc.text('Payslip for the Month of :', margin + 4, y + 5.5);
        doc.text(`${monthName} ${year}`, margin + contentW - 4, y + 5.5, { align: 'right' });
        y += 8;

        // ── 4. Employee Details header ──
        y += 3;
        doc.rect(margin, y, contentW, 7);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
        doc.text('Employee Details', pageW / 2, y + 5, { align: 'center' });
        y += 7 + 3;

        // ── 5. Employee details table ──
        const cellFn = (label, value, cx, cy, w) => {
            doc.setDrawColor(0); doc.setLineWidth(0.2);
            doc.rect(cx, cy, w * 0.45, 7);
            doc.rect(cx + w * 0.45, cy, w * 0.55, 7);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(0, 0, 0);
            doc.text(label, cx + 2, cy + 5);
            doc.text(String(value || '-'), cx + w * 0.45 + w * 0.55 / 2, cy + 5, { align: 'center' });
        };

        const halfW = contentW / 2;
        const empRowH = 7;
        const doj = empRecord.date_of_joining ? new Date(empRecord.date_of_joining).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '/') : '-';

        cellFn('Employee ID', employee_id || '-', margin, y, halfW);
        cellFn('Employee Name', employee_name || '-', margin, y + empRowH, halfW);
        cellFn('Designation', empRecord.designation || '-', margin, y + empRowH * 2, halfW);
        cellFn('Department', empRecord.department || '-', margin, y + empRowH * 3, halfW);
        cellFn('Date of Joining', doj, margin, y + empRowH * 4, halfW);
        cellFn('Account No.', empRecord.bank_account_number || '-', margin + halfW, y, halfW);
        cellFn('Payable Days', payslip.payable_days || '-', margin + halfW, y + empRowH, halfW);

        y += empRowH * 5 + 5;

        // ── 6. Salary Details header ──
        doc.rect(margin, y, contentW, 7);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(0, 0, 0);
        doc.text('Salary Details', pageW / 2, y + 5, { align: 'center' });
        y += 7 + 3;

        // ── 7. Gross Monthly Salary row ──
        doc.setDrawColor(0); doc.setLineWidth(0.3);
        doc.rect(margin, y, contentW * 0.28, 8);
        doc.rect(margin + contentW * 0.28, y, contentW * 0.15, 8);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5);
        doc.text('Gross Monthly Salary', margin + 2, y + 5.5);
        doc.text(fmt(gross_salary), margin + contentW * 0.28 + contentW * 0.15 - 3, y + 5.5, { align: 'right' });
        y += 8 + 3;

        // ── 8. Three-column salary table ──
        const col1W = contentW * 0.32;
        const col2W = contentW * 0.34;
        const col3W = contentW * 0.34;
        const col1X = margin;
        const col2X = margin + col1W;
        const col3X = margin + col1W + col2W;

        // Section headers
        doc.setDrawColor(0); doc.setLineWidth(0.3);
        doc.rect(col1X, y, col1W, 7); doc.rect(col2X, y, col2W, 7); doc.rect(col3X, y, col3W, 7);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
        doc.text('Standard Monthly Payable Salary', col1X + col1W / 2, y + 4.8, { align: 'center' });
        doc.text('Earnings', col2X + col2W / 2, y + 4.8, { align: 'center' });
        doc.text('Deductions', col3X + col3W / 2, y + 4.8, { align: 'center' });
        y += 7;

        // Spacer row
        doc.rect(col1X, y, col1W, 4); doc.rect(col2X, y, col2W, 4); doc.rect(col3X, y, col3W, 4);
        y += 4;

        // Sub-header Category / (Rs.)
        const catW1 = col1W * 0.58; const amtW1 = col1W * 0.42;
        const catW2 = col2W * 0.58; const amtW2 = col2W * 0.42;
        const catW3 = col3W * 0.58; const amtW3 = col3W * 0.42;
        doc.rect(col1X, y, catW1, 7); doc.rect(col1X + catW1, y, amtW1, 7);
        doc.rect(col2X, y, catW2, 7); doc.rect(col2X + catW2, y, amtW2, 7);
        doc.rect(col3X, y, catW3, 7); doc.rect(col3X + catW3, y, amtW3, 7);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
        doc.text('Category', col1X + catW1 / 2, y + 4.8, { align: 'center' });
        doc.text('(Rs.)', col1X + catW1 + amtW1 / 2, y + 4.8, { align: 'center' });
        doc.text('Category', col2X + catW2 / 2, y + 4.8, { align: 'center' });
        doc.text('(Rs.)', col2X + catW2 + amtW2 / 2, y + 4.8, { align: 'center' });
        doc.text('Category', col3X + catW3 / 2, y + 4.8, { align: 'center' });
        doc.text('(Rs.)', col3X + catW3 + amtW3 / 2, y + 4.8, { align: 'center' });
        y += 7;

        // Data rows
        const triRow = (l1, v1, l2, v2, l3, v3) => {
            const rh = 7;
            doc.setDrawColor(0); doc.setLineWidth(0.2);
            doc.rect(col1X, y, catW1, rh); doc.rect(col1X + catW1, y, amtW1, rh);
            doc.rect(col2X, y, catW2, rh); doc.rect(col2X + catW2, y, amtW2, rh);
            doc.rect(col3X, y, catW3, rh); doc.rect(col3X + catW3, y, amtW3, rh);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(0, 0, 0);
            if (l1) doc.text(l1, col1X + 2, y + 4.8);
            if (v1 !== null && v1 !== undefined) doc.text(fmt(v1), col1X + catW1 + amtW1 - 2, y + 4.8, { align: 'right' });
            if (l2) doc.text(l2, col2X + 2, y + 4.8);
            if (v2 !== null && v2 !== undefined) doc.text(fmt(v2), col2X + catW2 + amtW2 - 2, y + 4.8, { align: 'right' });
            if (l3) doc.text(l3, col3X + 2, y + 4.8);
            if (v3 !== null && v3 !== undefined) doc.text(fmt(v3), col3X + catW3 + amtW3 - 2, y + 4.8, { align: 'right' });
            y += rh;
        };

        triRow('Basic Salary', basic_salary, 'Basic Salary', basic_salary, pf_deduction ? 'ESIC' : '', pf_deduction || null);
        triRow('House Rent Allowance (HRA)', hra, 'House Rent Allowance (HRA)', hra, '', null);
        triRow('Special Allowance', payableMonthlySpecial, 'Special Allowance', payableMonthlySpecial, '', null);
        triRow('', null, '', null, '', null);

        // Totals row
        doc.setDrawColor(0); doc.setLineWidth(0.2);
        doc.rect(col1X, y, catW1, 7); doc.rect(col1X + catW1, y, amtW1, 7);
        doc.rect(col2X, y, catW2, 7); doc.rect(col2X + catW2, y, amtW2, 7);
        doc.rect(col3X, y, catW3, 7); doc.rect(col3X + catW3, y, amtW3, 7);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(0, 0, 0);
        doc.text('Total', col1X + catW1 / 2, y + 4.8, { align: 'center' });
        doc.text(fmt(gross_salary), col1X + catW1 + amtW1 - 2, y + 4.8, { align: 'right' });
        doc.text('Total', col3X + catW3 / 2, y + 4.8, { align: 'center' });
        doc.text(fmt(totalDeductions), col3X + catW3 + amtW3 - 2, y + 4.8, { align: 'right' });
        y += 7;

        // Earnings total row
        doc.rect(col1X, y, col1W, 7);
        doc.rect(col2X, y, catW2, 7); doc.rect(col2X + catW2, y, amtW2, 7);
        doc.rect(col3X, y, col3W, 7);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
        doc.text('Total', col2X + catW2 / 2, y + 4.8, { align: 'center' });
        const earningsTotal = basic_salary + hra + payableMonthlySpecial;
        doc.text(fmt(earningsTotal), col2X + catW2 + amtW2 - 2, y + 4.8, { align: 'right' });
        y += 7;

        // ── 9. Net Payable Salary ──
        doc.setDrawColor(0); doc.setLineWidth(0.3);
        doc.rect(col1X, y, col1W * 0.55, 8);
        doc.rect(col1X + col1W * 0.55, y, col1W * 0.45, 8);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(0, 0, 0);
        doc.text('Net Payable Salary', col1X + 2, y + 5.5);
        doc.text(fmt(net_salary), col1X + col1W - 3, y + 5.5, { align: 'right' });
        y += 8 + 10;

        // ── 10. FOOTER ──
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(80, 80, 80);
        doc.text("This payslip is computer generated and doesn't require signature or any company seal.", margin, y);

        // Convert PDF to Uint8Array for upload
        const pdfArrayBuffer = doc.output('arraybuffer');
        const pdfUint8 = new Uint8Array(pdfArrayBuffer);

        // Upload PDF to storage and get a public URL
        const fileName = `Payslip_${employee_name?.replace(/\s+/g, '_')}_${monthName}_${year}.pdf`;
        const pdfBlob = new Blob([pdfUint8], { type: 'application/pdf' });
        const { file_url: pdfUrl } = await base44.asServiceRole.integrations.Core.UploadFile({ file: pdfBlob });

        // ---- Send Email with PDF download link ----
        const emailBody = `
Dear ${employee_name || 'Employee'},

Your salary slip for ${monthName} ${year} is ready. Please download it using the link below:

  Download Payslip: ${pdfUrl}

Summary:
  Gross Salary    : ₹${Number(gross_salary).toLocaleString('en-IN')}
  Total Deductions: ₹${Number(totalDeductions).toLocaleString('en-IN')}
  Net Pay         : ₹${Number(net_salary).toLocaleString('en-IN')}
  Payment Status  : ${payment_status.charAt(0).toUpperCase() + payment_status.slice(1)}

If you have any questions about your payslip, please contact HR.

Regards,
SaberTechs HR Team
        `.trim();

        await base44.asServiceRole.integrations.Core.SendEmail({
            to: employee_email,
            subject: `Your Salary Slip for ${monthName} ${year} - SaberTechs`,
            body: emailBody,
        });

        return Response.json({
            success: true,
            message: `Payslip emailed to ${employee_email}`,
            employee: employee_name,
            period: `${monthName} ${year}`
        });

    } catch (error) {
        console.error('sendPayslipEmail error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});