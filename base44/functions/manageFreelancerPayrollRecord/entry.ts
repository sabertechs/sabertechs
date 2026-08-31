import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { can } from '../../shared/permissions.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await can(base44, user, 'payroll.freelancer.records'))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { action, id, data } = body || {};
    if (!id || !['update', 'delete'].includes(action)) {
      return Response.json({ error: 'Invalid request' }, { status: 400 });
    }

    if (action === 'update') {
      const record = await base44.asServiceRole.entities.FreelancerPayroll.update(id, data || {});
      return Response.json({ record });
    }

    await base44.asServiceRole.entities.FreelancerPayroll.delete(id);
    return Response.json({ success: true });
  } catch (error) {
    console.error('manageFreelancerPayrollRecord error:', error?.message || error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});
