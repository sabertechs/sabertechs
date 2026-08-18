import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        // Only platform admin may run this
        if (user?.role !== 'admin') {
            return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
        }

        // Get all freelancers (contractual employees)
        const freelancers = await base44.asServiceRole.entities.Employee.filter({ employment_type: 'contractual' });
        
        const defaultAccess = ['projects', 'payslips', 'company_feed'];
        let updated = 0;
        let skipped = 0;

        for (const freelancer of freelancers) {
            // Only update if they have empty or missing section_access
            if (!freelancer.section_access || freelancer.section_access.length === 0) {
                await base44.asServiceRole.entities.Employee.update(freelancer.id, {
                    section_access: defaultAccess
                });
                updated++;
            } else {
                skipped++;
            }
        }

        return Response.json({ 
            success: true,
            total_freelancers: freelancers.length,
            updated,
            skipped,
            message: `Updated ${updated} freelancers with default access. Skipped ${skipped} who already had access configured.`
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});