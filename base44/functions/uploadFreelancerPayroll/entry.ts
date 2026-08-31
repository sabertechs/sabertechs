import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { can } from '../../shared/permissions.ts';
import { parseSpreadsheetDate } from '../../shared/spreadsheetDates.ts';
import * as XLSX from 'npm:xlsx@0.18.5';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Designation Access is the sole source of truth — canonical key only.
    const allowed = await can(base44, user, 'payroll.freelancer.upload');
    if (!allowed) {
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
      const dateRes = parseSpreadsheetDate(rawDriveDate);
      const driveDate = dateRes.ok ? dateRes.value : '';
      if (!driveDate) errors.push(`Missing or invalid Drive Date "${rawDriveDate}": ${dateRes.error || 'empty'}`);

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

    // Insert all records in parallel chunks for speed
    let inserted = 0;
    const insertErrors = [];
    const chunkSize = 500;
    const chunks = [];
    for (let i = 0; i < records.length; i += chunkSize) {
      chunks.push({ start: i, data: records.slice(i, i + chunkSize) });
    }

    const results = await Promise.all(
      chunks.map(async ({ start, data }) => {
        try {
          const result = await base44.asServiceRole.entities.FreelancerPayroll.bulkCreate(data);
          const count = Array.isArray(result) ? result.length : data.length;
          console.log(`Chunk ${start}-${start + data.length}: inserted ${count}`);
          return { count, error: null };
        } catch (e) {
          console.error(`Chunk ${start} error:`, e.message);
          return { count: 0, error: `Rows ${start + 2}-${start + data.length + 1}: ${e.message}` };
        }
      })
    );

    for (const r of results) {
      inserted += r.count;
      if (r.error) insertErrors.push(r.error);
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