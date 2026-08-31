import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Syncs Employee → User.data permission context.
 * Triggered by Employee create/update automation or called directly with
 * { employee_email, designation, employment_type, department, section_access }.
 * Designation and employment type are the only permission-driving fields.
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json();

        let email, department, section_access, designation, employment_type;

        if (body.data && body.data.email) {
            email = body.data.email;
            department = body.data.department;
            section_access = body.data.section_access;
            designation = body.data.designation;
            employment_type = body.data.employment_type;
        } else {
            email = body.employee_email;
            department = body.department;
            section_access = body.section_access;
            designation = body.designation;
            employment_type = body.employment_type;
        }

        if (!email) {
            return Response.json({ error: 'Missing employee email' }, { status: 400 });
        }

        const users = await base44.asServiceRole.entities.User.filter({ email });
        if (users.length === 0) {
            return Response.json({ message: 'No platform user found, skipping', email });
        }

        const user = users[0];

        const newData = { ...(user.data || {}) };
        if (department !== undefined) newData.department = department;
        if (section_access !== undefined) newData.section_access = section_access;
        if (designation !== undefined) newData.designation = designation;
        if (employment_type !== undefined) newData.employment_type = employment_type;
        await base44.asServiceRole.entities.User.update(user.id, { data: newData });

        return Response.json({ success: true, email, designation });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});