import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Syncs Employee → User (platform level): role, department, section_access.
 * Triggered by the "Sync Employee Role to Platform User" entity automation
 * on Employee create/update, or called directly with
 * { employee_email, role, department, section_access }.
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json();

        let email, role, department, section_access;

        if (body.data && body.data.email) {
            // Entity automation payload
            email = body.data.email;
            role = body.data.role;
            department = body.data.department;
            section_access = body.data.section_access;
        } else {
            // Direct call
            email = body.employee_email;
            role = body.role;
            department = body.department;
            section_access = body.section_access;
        }

        if (!email) {
            return Response.json({ error: 'Missing employee email' }, { status: 400 });
        }

        const users = await base44.asServiceRole.entities.User.filter({ email });
        if (users.length === 0) {
            return Response.json({ message: 'No platform user found, skipping', email });
        }

        const user = users[0];

        if (user.role === 'admin') {
            return Response.json({ message: 'Skipped — user is platform admin', email });
        }

        const validRoles = ['hr', 'manager', 'department_head', 'employee', 'freelancer'];
        const targetRole = role && validRoles.includes(role) ? role : 'employee';

        await base44.asServiceRole.entities.User.update(user.id, {
            role: targetRole,
            data: {
                ...(user.data || {}),
                department,
                section_access,
            },
        });

        return Response.json({ success: true, email, role: targetRole });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});