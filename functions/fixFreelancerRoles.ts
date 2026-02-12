import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    // Get all employees with contractual employment type but wrong role
    const allEmployees = await base44.asServiceRole.entities.Employee.list();
    const freelancersToFix = allEmployees.filter(emp => 
      emp.employment_type === 'contractual' && emp.role !== 'freelancer'
    );

    const results = {
      total_found: freelancersToFix.length,
      updated: [],
      failed: []
    };

    for (const emp of freelancersToFix) {
      try {
        await base44.asServiceRole.entities.Employee.update(emp.id, {
          role: 'freelancer',
          section_access: ['projects', 'payslips', 'company_feed']
        });
        results.updated.push({
          name: emp.full_name,
          email: emp.email,
          old_role: emp.role
        });
      } catch (error) {
        results.failed.push({
          name: emp.full_name,
          email: emp.email,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      message: `Updated ${results.updated.length} freelancers from employee to freelancer role`,
      results
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});