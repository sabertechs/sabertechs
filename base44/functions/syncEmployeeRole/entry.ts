import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Syncs Employee → User (platform level):
 *   - role
 *   - department
 *   - section_access (custom permission overrides)
 *
 * Triggered by entity automation on Employee create/update,
 * or called directly with { employee_email } for manual/bulk/self-healing sync.
 *
 * Security: on direct calls, the role/department/section_access are read
 * from the Employee entity — never trusted from the request body — to
 * prevent role escalation.
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json();

        let email, role, department, section_access;

        // Handle entity automation payload
        if (body.data && body.data.email) {
            email = body.data.email;
            role = body.data.role;
            department = body.data.department;
            section_access = body.data.section_access;
        } else if (body.employee_email) {
            // Direct call — look up Employee entity for security
            email = body.employee_email;
            const employees = await base44.asServiceRole.entities.Employee.filter({ email });
            if (employees.length === 0) {
                return Response.json({ message: 'No employee record found for this email', email });
            }
            const emp = employees[0];
            role = emp.role;
            department = emp.department;
            section_access = emp.section_access;
        } else {
            return Response.json({ error: 'Missing employee email' }, { status: 400 });
        }

        if (!email) {
            return Response.json({ error: 'Missing employee email' }, { status: 400 });
        }

        // Find User account by email
        const users = await base44.asServiceRole.entities.User.filter({ email });

        if (users.length === 0) {
            return Response.json({ message: 'No platform user found, skipping', email });
        }

        const user = users[0];

        // Never downgrade a platform admin's role
        if (user.role === 'admin') {
            return Response.json({ message: 'Skipped — user is platform admin', email });
        }

        const validRoles = ['hr', 'manager', 'department_head', 'employee', 'freelancer'];
        const targetRole = role && validRoles.includes(role) ? role : 'employee';

        const updates = {};

        // Sync role if changed
        if (user.role !== targetRole) {
            updates.role = targetRole;
        }

        // Sync department and section_access into user.data
        const currentData = user.data || {};
        const needsDeptSync = department !== undefined && currentData.department !== department;
        const needsAccessSync = section_access !== undefined &&
            JSON.stringify(currentData.section_access || []) !== JSON.stringify(section_access || []);

        if (needsDeptSync || needsAccessSync) {
            updates.data = {
                ...currentData,
                ...(department !== undefined ? { department } : {}),
                ...(section_access !== undefined ? { section_access } : {}),
            };
        }

        if (Object.keys(updates).length === 0) {
            return Response.json({ message: 'Already in sync', email });
        }

        await base44.asServiceRole.entities.User.update(user.id, updates);

        return Response.json({
            success: true,
            email,
            synced: updates,
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});