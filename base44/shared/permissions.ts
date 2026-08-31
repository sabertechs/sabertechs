/**
 * Backend Designation Access permission resolver — single source of truth for
 * backend authorization paths. Mirrors the frontend cascade so sidebar, routes,
 * page actions, and backend checks all use identical logic.
 *
 * Way 1: user.data is the SOLE permission source (designation + employment_type).
 * The Employee entity is never queried for authorization. No per-employee
 * overrides. Action-based module.action keys with a legacy alias bridge.
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

const FREELANCER_FIXED_PERMISSIONS = ['projects.view'];

// Legacy aliases are retained only as migration metadata. They are never accepted
// by the backend authorization resolver.
  view_employees: ['hr.employees.view'],
  manage_employees: ['hr.employees.manage'],
  view_offer_letters: ['hr.offer_letters'],
  manage_onboarding: ['hr.onboarding'],
  bg_verification: ['hr.bg_verification'],
  api_verification: ['hr.api_verification'],
  bulk_pan_verify: ['hr.bulk_pan'],
  view_freelancers: ['freelancers.view'],
  manage_freelancers: ['freelancers.manage'],
  upload_payroll: ['payroll.freelancer.upload'],
  view_payroll_records: ['payroll.freelancer.records'],
  view_all_payslips: ['payroll.employee.view'],
  manage_payslips: ['payroll.employee.edit'],
  self_attendance: ['attendance.self.view', 'attendance.self.mark'],
  manage_attendance: ['attendance.team.view', 'attendance.team.edit'],
  submit_expenses: ['expenses.self.submit'],
  approve_expenses: ['expenses.team.approve'],
  view_projects: ['projects.view'],
  manage_projects: ['projects.create', 'projects.edit', 'projects.delete'],
  view_project_analytics: ['projects.analytics'],
  manage_task_templates: ['projects.task_templates'],
  manage_assets: ['assets.manage', 'assets.view', 'assets.create', 'assets.approve'],
  manage_notifications: ['comm.notifications'],
  manage_policies: ['comm.policies.manage'],
  view_policies: ['comm.policies.view'],
  manage_company_feed: ['feed.manage'],
  view_reports: ['reports.view'],
  access_settings: ['system.settings'],
  access_control: ['system.access_control'],
  module_management: ['system.module_management'],
  view_team: ['system.team.view'],
};

function resolveCan(effectivePerms: string[], permissionKey: string): boolean {
  if (!permissionKey) return false;
  return effectivePerms.includes(permissionKey);
}

/**
 * Returns the effective action-based permission keys for a user, or null if the
 * user is the platform admin (app owner) who has full access. Reads designation +
 * employment_type from user.data — never queries the Employee entity.
 */
export async function getUserPermissions(base44: any, user: any): Promise<string[] | null> {
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
  const perms = await getUserPermissions(base44, user);
  if (perms === null) return false;
  return resolveCan(perms, permission);
}