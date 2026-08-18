/**
 * Backend Designation Access permission resolver — single source of truth for
 * backend functions. Mirrors the frontend getEffectivePermissions cascade so
 * that sidebar visibility, page actions, and backend checks all use the same
 * Designation Access logic.
 *
 * Usage:
 *   import { can } from '../../shared/permissions.ts';
 *   if (!(await can(base44, user, 'upload_payroll'))) return Response.json({ error: 'Forbidden' }, { status: 403 });
 */

const DESIGNATION_HIERARCHY = [
  { name: 'Employee', level: 1 },
  { name: 'Assistant Manager', level: 2 },
  { name: 'Team Lead', level: 3 },
  { name: 'Senior Manager', level: 4 },
  { name: 'HR Head', level: 5 },
];

const FREELANCER_FIXED_PERMISSIONS = ['view_projects'];

/**
 * Returns the effective permission keys for a user, or null if the user is the
 * platform admin (app owner) who has full access.
 */
export async function getUserPermissions(base44, user) {
  if (!user) return [];
  // Platform admin (app owner) override — the only role-based check that remains
  if (user.role === 'admin') return null;

  const employees = await base44.asServiceRole.entities.Employee.filter({ email: user.email });
  const employee = employees[0];
  if (!employee) return [];

  const dpRows = await base44.asServiceRole.entities.DesignationPermission.list('display_order');

  const hierarchyEntry = DESIGNATION_HIERARCHY.find(d =>
    d.name.toLowerCase() === employee.designation?.toLowerCase()
  );

  let perms;
  if (!hierarchyEntry) {
    // Not in hierarchy (e.g., Proctor) — own permissions only
    const userDesig = dpRows.find(dp =>
      dp.designation_name?.toLowerCase() === employee.designation?.toLowerCase()
    );
    perms = [...(userDesig?.permissions || [])];
  } else {
    // Cascade: collect from all designations at or below the user's level
    const userLevel = hierarchyEntry.level;
    perms = dpRows
      .filter(dp => {
        const entry = DESIGNATION_HIERARCHY.find(d => d.name.toLowerCase() === dp.designation_name?.toLowerCase());
        return entry && entry.level <= userLevel;
      })
      .flatMap(dp => dp.permissions || []);
  }

  // Contractual employees (freelancers) always get their fixed modules
  if (employee.employment_type === 'contractual') {
    perms = [...perms, ...FREELANCER_FIXED_PERMISSIONS];
  }

  return [...new Set(perms)];
}

/** Returns true if the user has the given permission key (or is platform admin). */
export async function can(base44, user, permission) {
  const perms = await getUserPermissions(base44, user);
  if (perms === null) return true; // platform admin
  return perms.includes(permission);
}