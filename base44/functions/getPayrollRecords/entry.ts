import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { month, freelancer_email } = body;

    const filterObj = {};
    // Only apply month filter if no email search — email search should show all months
    if (freelancer_email) {
      filterObj.proctor_email = freelancer_email.toLowerCase();
    } else if (month) {
      filterObj.project_month = month;
    }

    const records = await base44.asServiceRole.entities.FreelancerPayroll.filter(filterObj, '-drive_start_date', 2000).catch(() => []);

    return Response.json({ records });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});