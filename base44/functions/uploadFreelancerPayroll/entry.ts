import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import * as XLSX from 'npm:xlsx@0.18.5';

// Helper: convert Excel serial date OR date string to YYYY-MM-DD
function parseExcelDate(val) {
  if (!val && val !== 0) return '';
  const num = Number(val);
  if (!isNaN(num) && num > 1000) {
    // Excel serial date: days since 1899-12-30
    const excelEpoch = new Date(1899, 11, 30);
    const d = new Date(excelEpoch.getTime() + num * 86400000);
    return d.toISOString().split('T')[0];
  }
  // Try as string date (dd-mm-yy, dd/mm/yyyy, yyyy-mm-dd, etc.)
  const str = val.toString().trim();
  // Try dd-mm-yy or dd/mm/yy or dd-mm-yyyy or dd/mm/yyyy
  const dmyMatch = str.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})$/);
  if (dmyMatch) {
    let [, d, m, y] = dmyMatch;
    if (y.length === 2) y = '20' + y;
    const dt = new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`);
    if (!isNaN(dt)) return dt.toISOString().split('T')[0];
  }
  const dt = new Date(str);
  if (!isNaN(dt)) return dt.toISOString().split('T')[0];
  return '';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.role !== 'hr')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { file_base64 } = body;

    if (!file_base64) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // Decode base64 to Uint8Array
    const binaryStr = atob(file_base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    let workbook;
    try {
      workbook = XLSX.read(bytes, { type: 'array' });
    } catch (e) {
      return Response.json({ error: `Failed to parse Excel file: ${e.message}` }, { status: 400 });
    }

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (!rows || rows.length === 0) {
      return Response.json({ error: 'The uploaded file has no data rows.' }, { status: 400 });
    }

    const batchId = `batch_${Date.now()}`;
    const records = [];
    const skippedRows = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      const errors = [];

      // Mandatory: Proctor Email
      const email = (row['Proctor Email'] || '').toString().trim().toLowerCase();
      if (!email) errors.push('Missing Proctor Email');
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push(`Invalid email: "${email}"`);

      // Mandatory: Client Name
      const clientName = (row['Client Name'] || row['Client'] || '').toString().trim();
      if (!clientName) errors.push('Missing Client Name');

      // Mandatory: Role
      const role = (row['Role'] || '').toString().trim();
      if (!role) errors.push('Missing Role');

      // Mandatory: Drive Date
      const rawDriveDate = row['Drive Date'] || row['Drive Start Date'] || '';
      const driveDate = parseExcelDate(rawDriveDate);
      if (!driveDate) errors.push(`Missing or invalid Drive Date: "${rawDriveDate}"`);

      // Mandatory: Drive Hours
      const driveHours = (row['Drive Hours'] || row['Driver hours'] || row['Driver Hours'] || '').toString().trim();
      if (!driveHours) errors.push('Missing Drive Hours');

      // Mandatory: Amount
      const rawAmount = row['Amount'] || row['Total Amount'] || '';
      const amount = rawAmount !== '' ? parseFloat(rawAmount) : NaN;
      if (isNaN(amount)) errors.push(`Missing or invalid Amount: "${rawAmount}"`);

      if (errors.length > 0) {
        skippedRows.push({ row: rowNum, email: email || '-', reason: errors.join('; ') });
        continue;
      }

      const projectMonth = driveDate.substring(0, 7);

      records.push({
        proctor_email: email,
        client_name: clientName,
        role,
        drive_start_date: driveDate,
        driver_hours: driveHours,
        total_amount: amount,
        project_month: projectMonth,
        upload_batch: batchId,
      });
    }

    // Insert valid records in chunks
    let inserted = 0;
    const insertErrors = [];
    const chunkSize = 200;

    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);
      try {
        const result = await base44.asServiceRole.entities.FreelancerPayroll.bulkCreate(chunk);
        inserted += Array.isArray(result) ? result.length : chunk.length;
      } catch (e) {
        insertErrors.push(`Rows ${i + 2}-${i + chunk.length + 1}: ${e.message}`);
      }
    }

    return Response.json({
      success: true,
      inserted,
      skipped: skippedRows,
      errors: insertErrors,
      batch_id: batchId,
      total_rows: rows.length,
    });
  } catch (e) {
    return Response.json({ error: `Unexpected error: ${e.message}` }, { status: 500 });
  }
});