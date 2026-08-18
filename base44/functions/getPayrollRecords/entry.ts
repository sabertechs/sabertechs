import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { can } from '../../shared/permissions.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { month, freelancer_email } = body;

    // Designation Access is the sole source of truth — require view_payroll_records
    const allowed = await can(base44, user, 'view_payroll_records');
    let records = [];

    if (allowed) {
      const filterObj = {};
      if (freelancer_email && freelancer_email.trim()) {
        filterObj.proctor_email = freelancer_email.trim().toLowerCase();
      }
      if (month) {
        filterObj.project_month = month;
      }
      records = await base44.asServiceRole.entities.FreelancerPayroll.filter(filterObj, '-date', 5000);
    } else {
      // Freelancer: can only see their own records
      const filterObj = { proctor_email: user.email };
      if (month) filterObj.project_month = month;
      records = await base44.asServiceRole.entities.FreelancerPayroll.filter(filterObj, '-date', 2000);
    }

    console.log(`getPayrollRecords: user=${user.email} month=${month} → ${records.length} records`);

    return Response.json({ records });
  } catch (error) {
    console.error('getPayrollRecords error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});