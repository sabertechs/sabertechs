import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { can } from '../../shared/permissions.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Designation Access is the sole source of truth. Only the canonical
    // freelancer payroll upload permission can authorize this endpoint.
    const allowed = await can(base44, user, 'payroll.freelancer.upload');
    if (!allowed) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { records } = body;

    if (!records || !Array.isArray(records) || records.length === 0) {
      return Response.json({ error: 'No records provided' }, { status: 400 });
    }

    // Log the exact date + project_month used for each record in this chunk, for traceability
    console.log(`uploadPayrollChunk: dates in this chunk: ${records.map(r => `${r.proctor_email}=${r.date}(${r.project_month})`).join(', ')}`);

    const result = await base44.asServiceRole.entities.FreelancerPayroll.bulkCreate(records);
    const count = Array.isArray(result) ? result.length : records.length;
    console.log(`uploadPayrollChunk: inserted ${count} of ${records.length}`);

    return Response.json({ inserted: count });
  } catch (error) {
    console.error('uploadPayrollChunk error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});