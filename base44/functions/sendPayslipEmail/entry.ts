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

        // ---- Generate PDF ----
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        const pageW = 210;
        const margin = 15;
        const col1 = margin;
        const col2 = pageW / 2 + 5;
        let y = 0;

        // Header background
        doc.setFillColor(79, 70, 229);
        doc.rect(0, 0, pageW, 38, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('SALARY SLIP', pageW / 2, 16, { align: 'center' });
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`${monthName} ${year}`, pageW / 2, 25, { align: 'center' });
        doc.setFontSize(9);
        doc.text('SaberTechs', pageW / 2, 33, { align: 'center' });

        // Employee Info box
        y = 46;
        doc.setFillColor(245, 247, 250);
        doc.roundedRect(margin, y, pageW - margin * 2, 30, 3, 3, 'F');

        doc.setTextColor(30, 30, 30);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Employee Details', col1 + 4, y + 8);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`Name: ${employee_name || '-'}`, col1 + 4, y + 16);
        doc.text(`Email: ${employee_email}`, col1 + 4, y + 22);
        if (employee_id) doc.text(`Employee ID: ${employee_id}`, col2, y + 16);
        doc.text(`Pay Period: ${monthName} ${year}`, col2, y + 22);

        // Earnings table
        y = 84;
        doc.setFillColor(79, 70, 229);
        doc.rect(margin, y, pageW - margin * 2, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('EARNINGS', col1 + 4, y + 5.5);
        doc.text('Amount (₹)', pageW - margin - 4, y + 5.5, { align: 'right' });

        const earnings = [
            ['Basic Salary', basic_salary],
            ['House Rent Allowance (HRA)', hra],
            ['Dearness Allowance (DA)', da],
            ['Other Allowances', other_allowances],
        ];

        y += 10;
        doc.setTextColor(30, 30, 30);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);

        earnings.forEach(([label, amount], i) => {
            if (i % 2 === 0) {
                doc.setFillColor(249, 250, 251);
                doc.rect(margin, y - 4, pageW - margin * 2, 8, 'F');
            }
            doc.text(label, col1 + 4, y + 0.5);
            doc.text(`₹ ${Number(amount).toLocaleString('en-IN')}`, pageW - margin - 4, y + 0.5, { align: 'right' });
            y += 8;
        });

        // Gross total
        doc.setFillColor(224, 231, 255);
        doc.rect(margin, y, pageW - margin * 2, 9, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(55, 48, 163);
        doc.text('Gross Salary', col1 + 4, y + 6);
        doc.text(`₹ ${Number(gross_salary).toLocaleString('en-IN')}`, pageW - margin - 4, y + 6, { align: 'right' });

        // Deductions table
        y += 16;
        doc.setFillColor(220, 38, 38);
        doc.rect(margin, y, pageW - margin * 2, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('DEDUCTIONS', col1 + 4, y + 5.5);
        doc.text('Amount (₹)', pageW - margin - 4, y + 5.5, { align: 'right' });

        const deductions = [
            ['Provident Fund (PF)', pf_deduction],
            ['Tax Deduction (TDS + PT)', tax_deduction],
            ['ESI / Other Deductions', other_deductions],
        ];

        y += 10;
        doc.setTextColor(30, 30, 30);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);

        deductions.forEach(([label, amount], i) => {
            if (i % 2 === 0) {
                doc.setFillColor(255, 249, 249);
                doc.rect(margin, y - 4, pageW - margin * 2, 8, 'F');
            }
            doc.text(label, col1 + 4, y + 0.5);
            doc.text(`₹ ${Number(amount).toLocaleString('en-IN')}`, pageW - margin - 4, y + 0.5, { align: 'right' });
            y += 8;
        });

        // Total deductions
        doc.setFillColor(254, 226, 226);
        doc.rect(margin, y, pageW - margin * 2, 9, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(153, 27, 27);
        doc.text('Total Deductions', col1 + 4, y + 6);
        doc.text(`₹ ${Number(totalDeductions).toLocaleString('en-IN')}`, pageW - margin - 4, y + 6, { align: 'right' });

        // Net Pay
        y += 16;
        doc.setFillColor(22, 163, 74);
        doc.rect(margin, y, pageW - margin * 2, 14, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text('NET PAY', col1 + 6, y + 9);
        doc.text(`₹ ${Number(net_salary).toLocaleString('en-IN')}`, pageW - margin - 4, y + 9, { align: 'right' });

        // Footer note
        y += 22;
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.setFont('helvetica', 'italic');
        doc.text('This is a system-generated payslip and does not require a signature.', pageW / 2, y, { align: 'center' });

        // Convert PDF to base64
        const pdfBase64 = doc.output('datauristring').split(',')[1];

        // ---- Send Email with PDF attachment ----
        const emailBody = `
Dear ${employee_name || 'Employee'},

Please find your salary slip for ${monthName} ${year} attached to this email.

Summary:
  Gross Salary   : ₹${Number(gross_salary).toLocaleString('en-IN')}
  Total Deductions: ₹${Number(totalDeductions).toLocaleString('en-IN')}
  Net Pay        : ₹${Number(net_salary).toLocaleString('en-IN')}
  Payment Status : ${payment_status.charAt(0).toUpperCase() + payment_status.slice(1)}

If you have any questions about your payslip, please contact HR.

Regards,
SaberTechs HR Team
        `.trim();

        await base44.asServiceRole.integrations.Core.SendEmail({
            to: employee_email,
            subject: `Your Salary Slip for ${monthName} ${year} - SaberTechs`,
            body: emailBody,
            attachments: [
                {
                    filename: `Payslip_${employee_name?.replace(/\s+/g, '_')}_${monthName}_${year}.pdf`,
                    content: pdfBase64,
                    encoding: 'base64',
                    contentType: 'application/pdf',
                }
            ]
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