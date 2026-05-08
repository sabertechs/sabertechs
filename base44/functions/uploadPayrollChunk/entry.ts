import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Look up Employee record to get the actual role assigned in the system
    const employees = await base44.asServiceRole.entities.Employee.filter({ email: user.email });
    const employeeRole = employees.length > 0 ? employees[0].role : null;

    const isAdmin = user.role === 'admin'
      || user.role === 'hr'
      || user.role === 'manager'
      || user.role === 'department_head'
      || employeeRole === 'hr'
      || employeeRole === 'manager'
      || employeeRole === 'department_head';

    if (!isAdmin) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { records } = body;

    if (!records || !Array.isArray(records) || records.length === 0) {
      return Response.json({ error: 'No records provided' }, { status: 400 });
    }

    const result = await base44.asServiceRole.entities.FreelancerPayroll.bulkCreate(records);
    const count = Array.isArray(result) ? result.length : records.length;
    console.log(`uploadPayrollChunk: inserted ${count} of ${records.length}`);

    return Response.json({ inserted: count });
  } catch (error) {
    console.error('uploadPayrollChunk error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});