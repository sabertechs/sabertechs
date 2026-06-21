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
        const margin = 15;
        const col1 = margin;
        const col2 = pageW / 2 + 5;
        let y = 0;

        // --- Logo header ---
        if (logoBase64) {
            doc.addImage(logoBase64, 'JPEG', 0, 0, pageW, 28);
            y = 30;
        } else {
            // Fallback plain header
            doc.setFillColor(79, 70, 229);
            doc.rect(0, 0, pageW, 18, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(13);
            doc.setFont('helvetica', 'bold');
            doc.text('SaberTechs', pageW / 2, 12, { align: 'center' });
            y = 22;
        }

        // --- Title bar ---
        doc.setFillColor(79, 70, 229);
        doc.rect(0, y, pageW, 20, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('SALARY SLIP', pageW / 2, y + 10, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`${monthName} ${year}`, pageW / 2, y + 17, { align: 'center' });
        y += 26;

        // --- Employee Info box ---
        doc.setDrawColor(220, 220, 220);
        doc.setFillColor(248, 249, 252);
        doc.roundedRect(margin, y, pageW - margin * 2, 32, 3, 3, 'FD');

        doc.setTextColor(30, 30, 30);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Employee Details', col1 + 5, y + 8);

        doc.setDrawColor(79, 70, 229);
        doc.setLineWidth(0.5);
        doc.line(col1 + 5, y + 10, col1 + 45, y + 10);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);
        doc.text(`Name: ${employee_name || '-'}`, col1 + 5, y + 18);
        doc.text(`Email: ${employee_email}`, col1 + 5, y + 25);
        if (employee_id) doc.text(`Employee ID: ${employee_id}`, col2, y + 18);
        doc.text(`Pay Period: ${monthName} ${year}`, col2, y + 25);
        y += 38;

        // --- Earnings table ---
        doc.setFillColor(79, 70, 229);
        doc.rect(margin, y, pageW - margin * 2, 9, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('EARNINGS', col1 + 5, y + 6);
        doc.text('Amount (₹)', pageW - margin - 4, y + 6, { align: 'right' });
        y += 10;

        doc.setTextColor(40, 40, 40);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        [['Basic Salary', basic_salary], ['House Rent Allowance (HRA)', hra], ['Dearness Allowance (DA)', da], ['Other Allowances', other_allowances]].forEach(([label, amount], i) => {
            if (i % 2 === 0) { doc.setFillColor(249, 250, 251); doc.rect(margin, y - 3, pageW - margin * 2, 8, 'F'); }
            doc.text(label, col1 + 5, y + 2.5);
            doc.text(`₹ ${Number(amount).toLocaleString('en-IN')}`, pageW - margin - 4, y + 2.5, { align: 'right' });
            y += 8;
        });

        // Gross total
        doc.setFillColor(224, 231, 255);
        doc.rect(margin, y, pageW - margin * 2, 10, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(55, 48, 163);
        doc.text('Gross Salary', col1 + 5, y + 6.5);
        doc.text(`₹ ${Number(gross_salary).toLocaleString('en-IN')}`, pageW - margin - 4, y + 6.5, { align: 'right' });
        y += 16;

        // --- Deductions table ---
        doc.setFillColor(220, 38, 38);
        doc.rect(margin, y, pageW - margin * 2, 9, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('DEDUCTIONS', col1 + 5, y + 6);
        doc.text('Amount (₹)', pageW - margin - 4, y + 6, { align: 'right' });
        y += 10;

        doc.setTextColor(40, 40, 40);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        [['Provident Fund (PF)', pf_deduction], ['Tax Deduction (TDS + PT)', tax_deduction], ['ESI / Other Deductions', other_deductions]].forEach(([label, amount], i) => {
            if (i % 2 === 0) { doc.setFillColor(255, 249, 249); doc.rect(margin, y - 3, pageW - margin * 2, 8, 'F'); }
            doc.text(label, col1 + 5, y + 2.5);
            doc.text(`₹ ${Number(amount).toLocaleString('en-IN')}`, pageW - margin - 4, y + 2.5, { align: 'right' });
            y += 8;
        });

        // Total deductions
        doc.setFillColor(254, 226, 226);
        doc.rect(margin, y, pageW - margin * 2, 10, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(153, 27, 27);
        doc.text('Total Deductions', col1 + 5, y + 6.5);
        doc.text(`₹ ${Number(totalDeductions).toLocaleString('en-IN')}`, pageW - margin - 4, y + 6.5, { align: 'right' });
        y += 16;

        // Net Pay
        doc.setFillColor(22, 163, 74);
        doc.rect(margin, y, pageW - margin * 2, 16, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('NET PAY', col1 + 6, y + 10);
        doc.text(`₹ ${Number(net_salary).toLocaleString('en-IN')}`, pageW - margin - 4, y + 10, { align: 'right' });
        y += 24;

        // Footer note
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.setFont('helvetica', 'italic');
        doc.text('This is a system-generated payslip and does not require a signature.', pageW / 2, y, { align: 'center' });

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