import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    // Freelancers are contractual employees — access is driven by Designation Access, not role.
    const allEmployees = await base44.asServiceRole.entities.Employee.list();
    const freelancers = allEmployees.filter(emp => emp.employment_type === 'contractual');

    const results = {
      total_found: freelancers.length,
      updated: [],
      failed: []
    };

    for (const emp of freelancers) {
      try {
        await base44.asServiceRole.entities.Employee.update(emp.id, {
          section_access: ['projects', 'payslips', 'company_feed']
        });
        results.updated.push({
          name: emp.full_name,
          email: emp.email
        });
        
        // Add delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
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
      message: `Updated section access for ${results.updated.length} freelancers`,
      results
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});