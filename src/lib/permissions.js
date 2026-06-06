/**
 * Central Permission Configuration
 * 
 * Each permission is a string key. Permissions are grouped by module.
 * The layout, pages, and components check these permissions — not raw roles.
 * 
 * An employee's effective permissions = their role's defaults + any overrides in section_access.
 * If section_access is set (non-empty), it IS the complete permission list (full override).
 * If section_access is empty/null, we fall back to role defaults.
 */

export const PERMISSIONS = {
  // ── HR ADMIN ────────────────────────────────────────
  view_employees:          { label: 'View Employees',          module: 'HR Admin',      description: 'See employee list and profiles' },
  manage_employees:        { label: 'Manage Employees',        module: 'HR Admin',      description: 'Add, edit, upload employees' },
  view_offer_letters:      { label: 'Offer Letters',           module: 'HR Admin',      description: 'Create & manage offer letters' },
  manage_onboarding:       { label: 'Onboarding',              module: 'HR Admin',      description: 'Employee onboarding checklists' },
  bg_verification:         { label: 'BG Verification',         module: 'HR Admin',      description: 'Background verification workflow' },
  api_verification:        { label: 'API Verification',        module: 'HR Admin',      description: 'External API document checks' },
  bulk_pan_verify:         { label: 'Bulk PAN Verify',         module: 'HR Admin',      description: 'Bulk PAN card verification' },

  // ── FREELANCER ───────────────────────────────────────
  view_freelancers:        { label: 'View Freelancers',        module: 'Freelancers',   description: 'See freelancer list' },
  manage_freelancers:      { label: 'Manage Freelancers',      module: 'Freelancers',   description: 'Add, edit, upload freelancers' },
  upload_payroll:          { label: 'Upload Payroll',          module: 'Freelancers',   description: 'Upload freelancer payroll files' },
  view_payroll_records:    { label: 'View Payroll Records',    module: 'Freelancers',   description: 'View freelancer payroll records' },

  // ── PAYSLIPS / SALARY ────────────────────────────────
  view_all_payslips:       { label: 'View All Payslips',       module: 'Payroll',       description: 'See payslips of ALL employees (sensitive)' },
  manage_payslips:         { label: 'Manage Payslips',         module: 'Payroll',       description: 'Generate and publish payslips' },

  // ── ATTENDANCE ───────────────────────────────────────
  manage_attendance:       { label: 'Manage Attendance',       module: 'Attendance',    description: 'Mark & edit attendance for team' },

  // ── EXPENSES ─────────────────────────────────────────
  approve_expenses:        { label: 'Approve Expenses',        module: 'Expenses',      description: 'Approve or reject expense claims' },

  // ── PROJECTS ─────────────────────────────────────────
  view_projects:           { label: 'View Projects',           module: 'Projects',      description: 'See project list and details' },
  manage_projects:         { label: 'Manage Projects',         module: 'Projects',      description: 'Create, edit and assign projects' },
  view_project_analytics:  { label: 'Project Analytics',       module: 'Projects',      description: 'View project reports and analytics' },
  manage_task_templates:   { label: 'Task Templates',          module: 'Projects',      description: 'Manage reusable project task templates' },

  // ── ASSETS ───────────────────────────────────────────
  manage_assets:           { label: 'Asset Management',        module: 'Assets',        description: 'Full asset lifecycle management' },

  // ── RECRUITMENT ──────────────────────────────────────
  view_recruitment:        { label: 'View Recruitment',        module: 'Recruitment',   description: 'Access recruitment dashboard & candidates' },
  manage_recruitment:      { label: 'Manage Recruitment',      module: 'Recruitment',   description: 'Edit candidates, pipeline, requisitions' },

  // ── COMMUNICATION ────────────────────────────────────
  manage_notifications:    { label: 'Notifications Center',    module: 'Communication', description: 'Send and schedule notifications' },
  manage_policies:         { label: 'Manage Policies',         module: 'Communication', description: 'Upload and edit company policies' },
  manage_company_feed:     { label: 'Manage Company Feed',     module: 'Communication', description: 'Post company updates and announcements' },

  // ── SYSTEM ───────────────────────────────────────────
  access_settings:         { label: 'App Settings',            module: 'System',        description: 'Configure application settings' },
  access_control:          { label: 'Access Control',          module: 'System',        description: 'Manage user roles & permissions' },
  module_management:       { label: 'Module Management',       module: 'System',        description: 'Enable/disable app modules' },
  view_team:               { label: 'View Team',               module: 'System',        description: 'See team member directory' },
};

/**
 * Default permissions for each role.
 * These apply when an employee has no section_access overrides.
 */
export const DEFAULT_PERMISSIONS_BY_ROLE = {
  hr: Object.keys(PERMISSIONS), // HR gets everything by default

  manager: [
    'view_employees', 'manage_employees',
    'view_offer_letters', 'manage_onboarding',
    'bg_verification', 'api_verification', 'bulk_pan_verify',
    'view_freelancers', 'manage_freelancers', 'upload_payroll', 'view_payroll_records',
    'view_all_payslips', 'manage_payslips',
    'manage_attendance',
    'approve_expenses',
    'view_projects', 'manage_projects', 'view_project_analytics', 'manage_task_templates',
    'view_recruitment', 'manage_recruitment',
    'manage_notifications',
    'view_team',
    // Note: NO manage_assets, NO access_settings, NO access_control, NO module_management
  ],

  department_head: [
    'view_employees', 'manage_employees',
    'view_offer_letters', 'manage_onboarding',
    'bg_verification', 'bulk_pan_verify',
    'view_freelancers', 'manage_freelancers', 'upload_payroll', 'view_payroll_records',
    'view_all_payslips', 'manage_payslips',
    'manage_attendance',
    'approve_expenses',
    'view_projects', 'manage_projects', 'view_project_analytics', 'manage_task_templates',
    'view_recruitment', 'manage_recruitment',
    'view_team',
    // Note: NO api_verification, NO manage_assets, NO system permissions
  ],

  employee: [
    // Self-service only — these drive the employee-facing sidebar
    'manage_attendance', // shows "My Attendance"
    'approve_expenses',  // shows "My Expenses"
    'view_team',
  ],

  freelancer: [
    'view_projects',
  ],
};

/**
 * Get the effective permissions for an employee.
 * Always starts with the role's default permissions.
 * section_access stores only the DELTA:
 *   - "perm_key"  → extra permission added beyond role defaults
 *   - "!perm_key" → role default permission explicitly removed
 */
export function getEffectivePermissions(employee) {
  if (!employee) return [];
  const roleDefaults = DEFAULT_PERMISSIONS_BY_ROLE[employee.role] || DEFAULT_PERMISSIONS_BY_ROLE.employee;
  if (!employee.section_access || employee.section_access.length === 0) {
    return roleDefaults;
  }
  const extras = employee.section_access.filter(p => !p.startsWith('!'));
  const removed = employee.section_access.filter(p => p.startsWith('!')).map(p => p.slice(1));
  const merged = [...new Set([...roleDefaults, ...extras])].filter(p => !removed.includes(p));
  return merged;
}

/**
 * Get all unique modules from PERMISSIONS config
 */
export function getPermissionModules() {
  const modules = {};
  Object.entries(PERMISSIONS).forEach(([key, val]) => {
    if (!modules[val.module]) modules[val.module] = [];
    modules[val.module].push({ key, ...val });
  });
  return modules;
}