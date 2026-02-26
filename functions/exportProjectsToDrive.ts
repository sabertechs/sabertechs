import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import ExcelJS from 'npm:exceljs@4.4.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch all project-related data in parallel
    const [projects, applications, tasks, responses] = await Promise.all([
      base44.asServiceRole.entities.Project.list(),
      base44.asServiceRole.entities.ProjectApplication.list(),
      base44.asServiceRole.entities.ProjectTask.list(),
      base44.asServiceRole.entities.TaskResponse.list(),
    ]);

    // Build Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SaberTechs';
    workbook.created = new Date();

    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3730A3' } };
    const headerFont = { bold: true, color: { argb: 'FFFFFFFF' } };

    const addSheet = (name, columns, rows) => {
      const sheet = workbook.addWorksheet(name);
      sheet.columns = columns.map(c => ({ header: c.header, key: c.key, width: c.width || 20 }));
      sheet.getRow(1).eachCell(cell => {
        cell.font = headerFont;
        cell.fill = headerFill;
        cell.alignment = { horizontal: 'center' };
      });
      rows.forEach(row => sheet.addRow(row));
    };

    // Sheet 1: Projects
    addSheet('Projects', [
      { header: 'Project ID', key: 'id', width: 15 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Priority', key: 'priority', width: 12 },
      { header: 'Work Mode', key: 'work_mode', width: 15 },
      { header: 'Location', key: 'location', width: 25 },
      { header: 'Payout', key: 'payout', width: 15 },
      { header: 'Start Date', key: 'start_date', width: 15 },
      { header: 'End Date', key: 'end_date', width: 15 },
      { header: 'Total Slots', key: 'total_slots', width: 12 },
      { header: 'Filled Slots', key: 'filled_slots', width: 12 },
      { header: 'Supervisor', key: 'supervisor_name', width: 20 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Created At', key: 'created_date', width: 22 },
    ], projects.map(p => ({
      id: p.id?.slice(-8),
      name: p.name,
      status: p.status,
      priority: p.priority,
      work_mode: p.work_mode,
      location: p.location,
      payout: p.payout,
      start_date: p.start_date,
      end_date: p.end_date,
      total_slots: p.total_slots || '',
      filled_slots: p.filled_slots || 0,
      supervisor_name: p.supervisor_name || '',
      description: p.description,
      created_date: p.created_date ? new Date(p.created_date).toLocaleString() : '',
    })));

    // Sheet 2: Applications
    addSheet('Applications', [
      { header: 'Application ID', key: 'id', width: 15 },
      { header: 'Project Name', key: 'project_name', width: 30 },
      { header: 'Freelancer Name', key: 'freelancer_name', width: 25 },
      { header: 'Freelancer Email', key: 'freelancer_email', width: 30 },
      { header: 'Freelancer Phone', key: 'freelancer_phone', width: 18 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Rating', key: 'rating', width: 10 },
      { header: 'Notes', key: 'notes', width: 30 },
      { header: 'Applied At', key: 'created_date', width: 22 },
    ], applications.map(a => ({
      id: a.id?.slice(-8),
      project_name: a.project_name,
      freelancer_name: a.freelancer_name,
      freelancer_email: a.freelancer_email,
      freelancer_phone: a.freelancer_phone || '',
      status: a.status,
      rating: a.rating || '',
      notes: a.notes || '',
      created_date: a.created_date ? new Date(a.created_date).toLocaleString() : '',
    })));

    // Sheet 3: Tasks
    addSheet('Tasks', [
      { header: 'Task ID', key: 'id', width: 15 },
      { header: 'Project Name', key: 'project_name', width: 30 },
      { header: 'Title', key: 'title', width: 30 },
      { header: 'Task Type', key: 'task_type', width: 15 },
      { header: 'Assigned To', key: 'assigned_to', width: 25 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Priority', key: 'priority', width: 12 },
      { header: 'Due Date', key: 'due_date', width: 15 },
      { header: 'Required', key: 'is_required', width: 10 },
      { header: 'Description', key: 'description', width: 40 },
    ], tasks.map(t => ({
      id: t.id?.slice(-8),
      project_name: t.project_name,
      title: t.title,
      task_type: t.task_type,
      assigned_to: t.assigned_to_name || t.assigned_to || '',
      status: t.status,
      priority: t.priority,
      due_date: t.due_date || '',
      is_required: t.is_required ? 'Yes' : 'No',
      description: t.description || '',
    })));

    // Sheet 4: Task Responses
    addSheet('Task Responses', [
      { header: 'Response ID', key: 'id', width: 15 },
      { header: 'Task ID', key: 'task_id', width: 15 },
      { header: 'Project ID', key: 'project_id', width: 15 },
      { header: 'Freelancer Name', key: 'freelancer_name', width: 25 },
      { header: 'Freelancer Email', key: 'freelancer_email', width: 30 },
      { header: 'Response Type', key: 'response_type', width: 15 },
      { header: 'Response Value', key: 'response_value', width: 40 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Admin Notes', key: 'admin_notes', width: 30 },
      { header: 'Submitted At', key: 'submission_date', width: 22 },
    ], responses.map(r => ({
      id: r.id?.slice(-8),
      task_id: r.task_id?.slice(-8),
      project_id: r.project_id?.slice(-8),
      freelancer_name: r.freelancer_name,
      freelancer_email: r.freelancer_email,
      response_type: r.response_type,
      response_value: r.response_value || '',
      status: r.status,
      admin_notes: r.admin_notes || '',
      submission_date: r.submission_date ? new Date(r.submission_date).toLocaleString() : '',
    })));

    // Write to buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Convert to base64
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    // Upload to Google Drive via multipart upload
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');
    const fileName = `Projects_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;
    const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    const boundary = 'foo_bar_baz';
    const multipartBody =
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify({ name: fileName, mimeType })}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: ${mimeType}\r\n` +
      `Content-Transfer-Encoding: base64\r\n\r\n` +
      `${base64}\r\n` +
      `--${boundary}--`;

    const driveRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary="${boundary}"`,
      },
      body: multipartBody,
    });

    if (!driveRes.ok) {
      const err = await driveRes.text();
      return Response.json({ error: 'Google Drive upload failed', details: err }, { status: 500 });
    }

    const driveData = await driveRes.json();
    const fileUrl = `https://drive.google.com/file/d/${driveData.id}/view`;

    return Response.json({ success: true, file_name: fileName, file_url: fileUrl, drive_file_id: driveData.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});