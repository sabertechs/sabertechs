/**
 * Shared User.data ↔ Employee permission sync logic.
 *
 * User.data holds the THREE permission-driving fields that backend RLS and
 * frontend can() checks read: designation, employment_type, department.
 * The Employee entity is the source of truth for these fields. This module
 * keeps them in sync.
 *
 * Used by:
 * - syncUserPermissions function (entity trigger + auth trigger)
 * - reconcileUserPermissions function (daily safety-net scan)
 */

/**
 * Extracts the three permission-driving fields from an Employee record.
 */
export function getEmployeePermissionData(emp) {
  return {
    designation: emp.designation || null,
    employment_type: emp.employment_type || null,
    department: emp.department || null,
  };
}

/**
 * Returns true if the User.data permission fields differ from the Employee's.
 * Normalizes null/undefined to '' so a null-vs-empty mismatch doesn't trigger
 * a needless write.
 */
export function needsSync(userData, empData) {
  const cur = userData || {};
  return (
    (cur.designation || "") !== (empData.designation || "") ||
    (cur.employment_type || "") !== (empData.employment_type || "") ||
    (cur.department || "") !== (empData.department || "")
  );
}

/**
 * Syncs a single employee's permission data to their matching platform User.
 * Idempotent — only writes when there's an actual mismatch.
 *
 * Returns a status object; never throws on "no user" or "no employee" —
 * those are expected states (user hasn't registered yet, or employee record
 * not yet created).
 */
export async function syncUserFromEmployee(base44, email) {
  const normalizedEmail = email?.toString().trim().toLowerCase();
  if (!normalizedEmail) return { error: "Missing email" };

  // Find the Employee record (source of truth)
  const employees = await base44.asServiceRole.entities.Employee.filter({
    email: normalizedEmail,
  });
  if (employees.length === 0) {
    return { message: "No employee record found", email: normalizedEmail };
  }
  const empData = getEmployeePermissionData(employees[0]);

  // Find the platform User
  const users = await base44.asServiceRole.entities.User.filter({
    email: normalizedEmail,
  });
  if (users.length === 0) {
    // User hasn't registered yet — the auth trigger will sync when they do
    return { message: "No platform user yet, will sync on registration", email: normalizedEmail };
  }
  const user = users[0];

  // Skip if already in sync
  if (!needsSync(user.data, empData)) {
    return { message: "Already in sync", email: normalizedEmail };
  }

  // Sync — preserve all other User.data fields
  const newData = { ...(user.data || {}), ...empData };
  await base44.asServiceRole.entities.User.update(user.id, { data: newData });

  return { success: true, email: normalizedEmail, synced: empData };
}