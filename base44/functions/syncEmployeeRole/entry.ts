import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Syncs Employee.role → User.role (platform level)
 * Called from entity automation on Employee create/update,
 * or directly with { employee_email, employee_role } for manual/bulk sync.
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json();

        let email, role;

        // Handle entity automation payload
        if (body.data && body.data.email) {
            email = body.data.email;
            role = body.data.role;
        } else {
            // Direct call or bulk sync
            email = body.employee_email;
            role = body.employee_role;
        }

        if (!email) {
            return Response.json({ error: 'Missing employee email' }, { status: 400 });
        }

        if (!role) {
            return Response.json({ message: 'No role to sync', email });
        }

        // Find User account by email
        const users = await base44.asServiceRole.entities.User.filter({ email });

        if (users.length === 0) {
            // User hasn't registered yet — skip silently
            return Response.json({ message: 'No platform user found, skipping', email });
        }

        const user = users[0];

        // Never downgrade a platform admin
        if (user.role === 'admin') {
            return Response.json({ message: 'Skipped — user is platform admin', email });
        }

        const validRoles = ['hr', 'manager', 'department_head', 'employee', 'freelancer'];
        const targetRole = validRoles.includes(role) ? role : 'employee';

        if (user.role === targetRole) {
            return Response.json({ message: 'Already in sync', email, role: targetRole });
        }

        await base44.asServiceRole.entities.User.update(user.id, { role: targetRole });

        return Response.json({ success: true, email, previousRole: user.role, newRole: targetRole });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});