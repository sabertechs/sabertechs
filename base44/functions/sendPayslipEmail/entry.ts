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
        const rightX = pageW - margin;
        const rowH = 10;
        let y = 0;

        // ── 1. LOGO (full width header image) ──
        if (logoBase64) {
            doc.addImage(logoBase64, 'JPEG', 0, 0, pageW, 30);
            y = 32;
        } else {
            doc.setFillColor(63, 81, 181);
            doc.rect(0, 0, pageW, 22, 'F');
            doc.setTextColor(255, 255, 255); doc.setFontSize(14); doc.setFont('helvetica', 'bold');
            doc.text('SaberTechs', pageW / 2, 14, { align: 'center' });
            y = 26;
        }

        // ── 2. TITLE BAR (indigo, centered) ──
        doc.setFillColor(79, 70, 229);
        doc.rect(0, y, pageW, 22, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20); doc.setFont('helvetica', 'bold');
        doc.text('SALARY SLIP', pageW / 2, y + 10, { align: 'center' });
        doc.setFontSize(10); doc.setFont('helvetica', 'normal');
        doc.text(`${monthName} ${year}`, pageW / 2, y + 17, { align: 'center' });
        doc.setFontSize(9);
        doc.text('SaberTechs', pageW / 2, y + 21, { align: 'center' });
        y += 28;

        // ── 3. EMPLOYEE DETAILS BOX ──
        const empBoxH = 32;
        doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3);
        doc.setFillColor(252, 252, 253);
        doc.roundedRect(margin, y, pageW - margin * 2, empBoxH, 2, 2, 'FD');
        doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30);
        doc.text('Employee Details', margin + 5, y + 8);
        doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(50, 50, 50);
        const midX = pageW / 2;
        doc.text(`Name: ${employee_name || '-'}`, margin + 5, y + 17);
        doc.text(`Email: ${employee_email || '-'}`, margin + 5, y + 25);
        doc.text(`Employee ID: ${employee_id || '-'}`, midX + 5, y + 17);
        doc.text(`Pay Period: ${monthName} ${year}`, midX + 5, y + 25);
        y += empBoxH + 8;

        // ── Helpers ──
        const fmtAmt = (n) => `Rs. ${Number(n).toLocaleString('en-IN')}`;
        const amtX = rightX - 3;

        const drawTableHeader = (label, r, g, b) => {
            doc.setFillColor(r, g, b);
            doc.rect(margin, y, pageW - margin * 2, rowH, 'F');
            doc.setTextColor(255, 255, 255); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
            doc.text(label, margin + 5, y + 6.8);
            doc.text('Amount (Rs.)', amtX, y + 6.8, { align: 'right' });
            y += rowH;
        };
        const drawRow = (label, amount, bgR, bgG, bgB) => {
            doc.setFillColor(bgR, bgG, bgB);
            doc.rect(margin, y, pageW - margin * 2, rowH, 'F');
            doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.2);
            doc.line(margin, y + rowH, amtX + 3, y + rowH);
            doc.setTextColor(40, 40, 40); doc.setFontSize(9.5); doc.setFont('helvetica', 'normal');
            doc.text(label, margin + 5, y + 6.8);
            doc.text(fmtAmt(amount), amtX, y + 6.8, { align: 'right' });
            y += rowH;
        };
        const drawSubtotalRow = (label, amount, r, g, b, tr, tg, tb) => {
            doc.setFillColor(r, g, b);
            doc.rect(margin, y, pageW - margin * 2, rowH + 2, 'F');
            doc.setTextColor(tr, tg, tb); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
            doc.text(label, margin + 5, y + 7.5);
            doc.text(fmtAmt(amount), amtX, y + 7.5, { align: 'right' });
            y += rowH + 2;
        };

        // ── 4. EARNINGS TABLE ──
        drawTableHeader('EARNINGS', 79, 70, 229);
        drawRow('Basic Salary', basic_salary, 255, 255, 255);
        drawRow('House Rent Allowance (HRA)', hra, 249, 249, 255);
        drawRow('Dearness Allowance (DA)', da, 255, 255, 255);
        drawRow('Other Allowances', other_allowances, 249, 249, 255);
        y += 2;
        drawSubtotalRow('Gross Salary', gross_salary, 232, 234, 255, 55, 48, 163);
        y += 8;

        // ── 5. DEDUCTIONS TABLE ──
        drawTableHeader('DEDUCTIONS', 220, 38, 38);
        drawRow('Provident Fund (PF)', pf_deduction, 255, 255, 255);
        drawRow('Tax Deduction (TDS + PT)', tax_deduction, 255, 249, 249);
        drawRow('ESI / Other Deductions', other_deductions, 255, 255, 255);
        y += 2;
        drawSubtotalRow('Total Deductions', totalDeductions, 255, 235, 235, 153, 27, 27);
        y += 8;

        // ── 6. NET PAY BAR ──
        const netH = 14;
        doc.setFillColor(34, 139, 34);
        doc.rect(margin, y, pageW - margin * 2, netH, 'F');
        doc.setTextColor(255, 255, 255); doc.setFontSize(13); doc.setFont('helvetica', 'bold');
        doc.text('NET PAY', margin + 6, y + 9.5);
        doc.text(fmtAmt(net_salary), amtX, y + 9.5, { align: 'right' });
        y += netH + 12;

        // ── 7. FOOTER ──
        doc.setFontSize(8); doc.setTextColor(130, 130, 130); doc.setFont('helvetica', 'italic');
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