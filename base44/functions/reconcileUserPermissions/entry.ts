import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { getEmployeePermissionData, needsSync } from "../../shared/userPermissionSync.ts";

/**
 * Daily safety-net reconciliation: scans ALL Employee records and syncs any
 * User.data permission fields that drifted from the Employee source of truth.
 *
 * Called by the "Daily Permission Reconciliation" scheduled workflow.
 * Catches cases that fall through the entity/auth trigger cracks:
 * - Bulk SDK updates that bypass the entity trigger
 * - Users who registered before their Employee record was created
 * - Any data corruption or manual database edits
 *
 * Processes in batches of 100 to stay within function timeout limits.
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);

    // Load all employees (paginated)
    const employees = [];
    let skip = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities.Employee.filter(
        {},
        "-created_date",
        1000,
        skip
      );
      employees.push(...batch);
      if (batch.length < 1000) break;
      skip += 1000;
    }

    // Build email → permission data map
    const empMap = {};
    for (const emp of employees) {
      const email = emp.email?.toString().trim().toLowerCase();
      if (email) empMap[email] = getEmployeePermissionData(emp);
    }

    // Process users in batches of 100
    const allEmails = Object.keys(empMap);
    let synced = 0;
    let alreadyInSync = 0;
    let noUserAccount = 0;

    for (let i = 0; i < allEmails.length; i += 100) {
      const chunk = allEmails.slice(i, i + 100);
      const users = await base44.asServiceRole.entities.User.filter({
        email: { $in: chunk },
      });

      for (const user of users) {
        const email = user.email?.toString().trim().toLowerCase();
        const empData = empMap[email];
        if (!empData) continue;

        if (needsSync(user.data, empData)) {
          const newData = { ...(user.data || {}), ...empData };
          await base44.asServiceRole.entities.User.update(user.id, {
            data: newData,
          });
          synced++;
        } else {
          alreadyInSync++;
        }
      }
      noUserAccount += chunk.length - users.length;
    }

    return Response.json({
      success: true,
      total_employees: employees.length,
      synced,
      already_in_sync: alreadyInSync,
      no_user_account: noUserAccount,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}