import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/** One-time permission migration. Platform-admin only. Copies permission-driving
 * fields from Employee into User.data so User.data becomes the sole runtime source.
 * This function is migration infrastructure only; it does not grant permissions.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller || caller.data?.designation?.toLowerCase() !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [users, employees] = await Promise.all([
      base44.asServiceRole.entities.User.list(),
      base44.asServiceRole.entities.Employee.list(),
    ]);

    const byEmail = new Map(employees.map((e: any) => [String(e.email || '').trim().toLowerCase(), e]));
    let updated = 0;
    let skipped = 0;
    const errors: any[] = [];

    for (const user of users) {
      const email = String(user.email || '').trim().toLowerCase();
      const emp = byEmail.get(email);
      const next = { ...(user.data || {}) };

      if (emp) {
        if (emp.designation) next.designation = emp.designation;
        if (emp.employment_type) next.employment_type = emp.employment_type;
        if (emp.department) next.department = emp.department;
        if (emp.section_access !== undefined) next.section_access = emp.section_access;
      } else if (caller?.data?.designation?.toLowerCase() === 'admin' && !next.designation) {
        next.designation = 'Admin';
        next.employment_type = next.employment_type || 'permanent';
      }

      if (!next.designation) {
        skipped++;
        continue;
      }

      const changed = JSON.stringify(next) !== JSON.stringify(user.data || {});
      if (!changed) {
        skipped++;
        continue;
      }

      try {
        await base44.asServiceRole.entities.User.update(user.id, { data: next });
        updated++;
      } catch (e) {
        errors.push({ email, error: e?.message || String(e) });
      }
    }

    return Response.json({ success: true, total_users: users.length, updated, skipped, errors });
  } catch (error) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});