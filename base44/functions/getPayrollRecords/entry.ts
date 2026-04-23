import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { month, freelancer_email } = body;

    const filterObj = {};
    if (month) filterObj.project_month = month;
    if (freelancer_email) filterObj.proctor_email = freelancer_email.toLowerCase();

    const records = await base44.asServiceRole.entities.FreelancerPayroll.filter(filterObj, '-drive_start_date', 500);

    return Response.json({ records });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});