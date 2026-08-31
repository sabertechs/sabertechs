/**
 * Backend Designation Access permission resolver — single source of truth for
 * backend authorization paths. Mirrors the frontend cascade so sidebar, routes,
 * page actions, and backend checks all use identical logic.
 *
 * Way 1: user.data is the SOLE permission source (designation + employment_type).
 * The Employee entity is never queried for authorization. No per-employee
 * overrides. Only canonical action-based module.action keys are accepted.
 *
 * Usage:
 *   import { can } from '../../shared/permissions.ts';
 *   if (!(await can(base44, user, 'payroll.freelancer.upload'))) {
 *     return Response.json({ error: 'Forbidden' }, { status: 403 });
 *   }
 */

const DESIGNATION_HIERARCHY = [
  { name: 'Employee', level: 1 },
  { name: 'Assistant Manager', level: 2 },
  { name: 'Team Lead', level: 3 },
  { name: 'Senior Manager', level: 4 },
  { name: 'HR Head', level: 5 },
];


function resolveCan(effectivePerms: string[], permissionKey: string): boolean {
  if (!permissionKey) return false;
  return effectivePerms.includes(permissionKey);
}

/**
 * Returns the effective action-based permission keys for a user. Reads designation +
 * employment_type from user.data — never queries the Employee entity.
 */
export async function getUserPermissions(base44: any, user: any): Promise<string[]> {
  if (!user) return [];
  // Admin is a designation, not an employee role. Platform account status is not
  // used to grant module permissions here.

  const designation = user?.data?.designation ?? null;
  const employmentType = user?.data?.employment_type ?? null;
  if (!designation) return [];

  const dpRows = await base44.asServiceRole.entities.DesignationPermission.list('display_order');

  const hierarchyEntry = DESIGNATION_HIERARCHY.find(
    (d) => d.name.toLowerCase() === designation.toLowerCase()
  );

  let perms: string[];
  if (!hierarchyEntry) {
    // Not in hierarchy (e.g., Proctor) — own permissions only
    const userDesig = dpRows.find(
      (dp: any) => dp.designation_name?.toLowerCase() === designation.toLowerCase()
    );
    perms = [...(userDesig?.permissions || [])];
  } else {
    const userLevel = hierarchyEntry.level;
    perms = dpRows
      .filter((dp: any) => {
        const entry = DESIGNATION_HIERARCHY.find(
          (d) => d.name.toLowerCase() === dp.designation_name?.toLowerCase()
        );
        return entry && entry.level <= userLevel;
      })
      .flatMap((dp: any) => dp.permissions || []);
  }

  return [...new Set(perms)];
}

/** Returns true only when the user's User.data.designation grants the canonical permission key. */
export async function can(base44: any, user: any, permission: string): Promise<boolean> {
  if (!permission) return false;
  // Admin designation (platform owner) has full access — mirrors the frontend
  // usePermissions() admin bypass so the platform owner isn't locked out of
  // backend-gated operations (Admin is outside the cascade hierarchy).
  const designation = user?.data?.designation?.toLowerCase();
  if (designation === 'admin') return true;
  const perms = await getUserPermissions(base44, user);
  return resolveCan(perms, permission);
}