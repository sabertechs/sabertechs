import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { month, freelancer_email } = body;

    const isAdmin = user.role === 'admin' || user.role === 'hr' || user.role === 'manager' || user.role === 'department_head';

    let records = [];

    if (isAdmin) {
      // Build filter server-side to avoid fetching all records
      const filterObj = {};
      if (freelancer_email && freelancer_email.trim()) {
        filterObj.proctor_email = freelancer_email.trim().toLowerCase();
      }
      if (month) {
        filterObj.project_month = month;
      }
      records = await base44.asServiceRole.entities.FreelancerPayroll.filter(filterObj, '-drive_start_date', 5000);
    } else {
      // Freelancer: can only see their own records
      const filterObj = { proctor_email: user.email };
      if (month) filterObj.project_month = month;
      records = await base44.asServiceRole.entities.FreelancerPayroll.filter(filterObj, '-drive_start_date', 2000);
    }

    console.log(`getPayrollRecords: user=${user.email} role=${user.role} month=${month} email=${freelancer_email} → ${records.length} records`);

    return Response.json({ records });
  } catch (error) {
    console.error('getPayrollRecords error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});