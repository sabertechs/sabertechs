import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import * as XLSX from 'npm:xlsx@0.18.5';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.role !== 'hr')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { file_base64, file_name } = body;

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
      const email = (row['Proctor Email'] || '').toString().trim().toLowerCase();
      if (!email) {
        skippedRows.push({ row: i + 2, reason: 'Missing Proctor Email' });
        continue;
      }

      // Parse drive_start_date
      const rawStartDate = row['Drive Start Date'] || '';
      let driveStartDate = '';
      if (rawStartDate) {
        const d = new Date(rawStartDate);
        if (!isNaN(d)) driveStartDate = d.toISOString().split('T')[0];
        else skippedRows.push({ row: i + 2, reason: `Invalid Drive Start Date: "${rawStartDate}"` });
      }

      // Derive project_month from drive_start_date
      const projectMonth = driveStartDate ? driveStartDate.substring(0, 7) : '';

      // Parse drive_end_date
      const rawEndDate = row['Drive End Date'] || '';
      let driveEndDate = '';
      if (rawEndDate) {
        const d = new Date(rawEndDate);
        if (!isNaN(d)) driveEndDate = d.toISOString().split('T')[0];
      }

      // Parse total_amount
      const rawAmount = row['Amount'] || row['Total Amount'] || row['total_amount'] || '';
      const totalAmount = rawAmount !== '' ? parseFloat(rawAmount) : null;

      const driveIdRaw = row['Drive ID'] ?? row['DriveID'] ?? '';
      const driveId = driveIdRaw !== '' ? parseInt(driveIdRaw) : null;

      const record = {
        proctor_email: email,
        upload_batch: batchId
      };
      if ((row['Proctor Name'] || '').toString().trim()) record.proctor_name = row['Proctor Name'].toString().trim();
      if (driveId !== null && !isNaN(driveId)) record.drive_id = driveId;
      if ((row['Account ID'] || row['Account ID '] || '').toString().trim()) record.account_id = (row['Account ID'] || row['Account ID '] || '').toString().trim();
      const clientId = parseInt(row['Client ID']);
      if (!isNaN(clientId)) record.client_id = clientId;
      if ((row['Client'] || '').toString().trim()) record.client_name = row['Client'].toString().trim();
      if ((row['Role'] || '').toString().trim()) record.role = row['Role'].toString().trim();
      if (driveStartDate) record.drive_start_date = driveStartDate;
      if ((row['Start Time'] || '').toString().trim()) record.start_time = row['Start Time'].toString().trim();
      if (driveEndDate) record.drive_end_date = driveEndDate;
      if ((row['End Time'] || '').toString().trim()) record.end_time = row['End Time'].toString().trim();
      if ((row['Driver hours'] || row['Driver Hours'] || '').toString().trim()) record.driver_hours = (row['Driver hours'] || row['Driver Hours'] || '').toString().trim();
      if (totalAmount !== null && !isNaN(totalAmount)) record.total_amount = totalAmount;
      if (projectMonth) record.project_month = projectMonth;

      records.push(record);
    }

    if (records.length === 0) {
      return Response.json({
        error: 'No valid records found in file.',
        skipped: skippedRows,
        total_rows: rows.length
      }, { status: 400 });
    }

    // Bulk insert in chunks of 50
    let inserted = 0;
    const errors = [];
    const chunkSize = 50;
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);
      try {
        await base44.asServiceRole.entities.FreelancerPayroll.bulkCreate(chunk);
        inserted += chunk.length;
      } catch (e) {
        errors.push(`Chunk ${Math.floor(i / chunkSize) + 1} failed: ${e.message}`);
      }
    }

    return Response.json({
      success: true,
      inserted,
      skipped: skippedRows,
      errors,
      batch_id: batchId,
      total_rows: rows.length
    });
  } catch (e) {
    return Response.json({ error: `Unexpected error: ${e.message}`, stack: e.stack }, { status: 500 });
  }
});