import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import * as XLSX from 'npm:xlsx@0.18.5';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user || (user.role !== 'admin' && user.role !== 'hr')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get('file');

  if (!file) {
    return Response.json({ error: 'No file provided' }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  const batchId = `batch_${Date.now()}`;
  const records = [];

  for (const row of rows) {
    const email = (row['Proctor Email'] || '').toString().trim().toLowerCase();
    if (!email) continue;

    // Parse drive_start_date
    const rawStartDate = row['Drive Start Date'] || '';
    let driveStartDate = '';
    if (rawStartDate) {
      const d = new Date(rawStartDate);
      if (!isNaN(d)) driveStartDate = d.toISOString().split('T')[0];
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

    // Parse total_amount (may be blank in current reports)
    const rawAmount = row['Amount'] || row['Total Amount'] || row['total_amount'] || '';
    const totalAmount = rawAmount !== '' ? parseFloat(rawAmount) : null;

    records.push({
      proctor_name: (row['Proctor Name'] || '').toString().trim(),
      proctor_email: email,
      drive_id: parseInt(row['Drive ID']) || 0,
      account_id: (row['Account ID'] || row['Account ID '] || '').toString().trim(),
      client_id: parseInt(row['Client ID']) || 0,
      client_name: (row['Client'] || '').toString().trim(),
      role: (row['Role'] || '').toString().trim(),
      drive_start_date: driveStartDate,
      start_time: (row['Start Time'] || '').toString().trim(),
      drive_end_date: driveEndDate,
      end_time: (row['End Time'] || '').toString().trim(),
      driver_hours: (row['Driver hours'] || row['Driver Hours'] || '').toString().trim(),
      total_amount: totalAmount,
      project_month: projectMonth,
      upload_batch: batchId
    });
  }

  if (records.length === 0) {
    return Response.json({ error: 'No valid records found in file' }, { status: 400 });
  }

  // Bulk insert in chunks of 50
  let inserted = 0;
  const chunkSize = 50;
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    await base44.asServiceRole.entities.FreelancerPayroll.bulkCreate(chunk);
    inserted += chunk.length;
  }

  return Response.json({ success: true, inserted, batch_id: batchId });
});