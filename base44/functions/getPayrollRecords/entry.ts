import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { month, freelancer_email } = body;

    const filterObj = {};
    if (freelancer_email) {
      filterObj.proctor_email = freelancer_email.trim().toLowerCase();
    }
    if (month) {
      filterObj.project_month = month;
    }

    console.log('getPayrollRecords filter:', JSON.stringify(filterObj));
    const records = await base44.asServiceRole.entities.FreelancerPayroll.filter(filterObj, '-drive_start_date', 2000).catch((e) => {
      console.error('Filter error:', e.message);
      return [];
    });

    return Response.json({ records });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});