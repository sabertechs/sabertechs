/**
 * Central Permission Configuration — Designation Access is the single source of truth.
 *
 * Hierarchy (low → high): Employee → Assistant Manager → Team Lead → Senior Manager → HR Head
 * Permissions cascade upward: a designation at level N inherits all permissions from levels 1..N.
 * Module-level overrides on individual employees can grant additional module access.
 */

// ── MODULE DEFINITIONS ─────────────────────────────
// To add a new module: add an entry here + permission keys in PERMISSIONS referencing this module ID.
// It will automatically appear in Module Management and Designation Access.

export const MODULES = {
  hr_admin:      { name: 'HR Admin',      description: 'Employee management, uploads, onboarding, offer letters' },
  freelancers:   { name: 'Freelancers',    description: 'Manage freelancers and their profiles' },
  payroll:       { name: 'Payroll',        description: 'Payslip generation and management' },
  attendance:    { name: 'Attendance',     description: 'Track and manage employee attendance' },
  expenses:      { name: 'Expenses',       description: 'Expense claims and approvals' },
  projects:      { name: 'Projects',       description: 'Manage projects, tasks, and assignments' },
  assets:        { name: 'Assets',         description: 'Company asset lifecycle management' },
  recruitment:   { name: 'Recruitment',    description: 'Recruitment pipeline and candidates' },
  communication: { name: 'Communication',  description: 'Notifications, policies, company feed' },
  reports:       { name: 'Reports',        description: 'Reports and analytics dashboards' },
  system:        { name: 'System',         description: 'App settings, access control, module management' },
  games:         { name: 'Games',          description: 'Office games and leaderboards' },
  company_feed:  { name: 'Company Feed',   description: 'Company announcements and social feed' },
};

// ── PERMISSION REGISTRY ────────────────────────────
// Each permission references a module ID. Adding a permission here auto-exposes it
// in both Module Management and Designation Access.

export const PERMISSIONS = {
  // ── HR ADMIN ────────────────────────────────────────
  view_employees:          { label: 'View Employees',          module: 'hr_admin',      description: 'See employee list and profiles' },
  manage_employees:        { label: 'Manage Employees',        module: 'hr_admin',      description: 'Add, edit, upload employees' },
  view_offer_letters:      { label: 'Offer Letters',           module: 'hr_admin',      description: 'Create & manage offer letters' },
  manage_onboarding:       { label: 'Onboarding',              module: 'hr_admin',      description: 'Employee onboarding checklists' },
  bg_verification:         { label: 'BG Verification',         module: 'hr_admin',      description: 'Background verification workflow' },
  api_verification:        { label: 'API Verification',        module: 'hr_admin',      description: 'External API document checks' },
  bulk_pan_verify:         { label: 'Bulk PAN Verify',         module: 'hr_admin',      description: 'Bulk PAN card verification' },

  // ── FREELANCERS ───────────────────────────────────────
  view_freelancers:        { label: 'View Freelancers',        module: 'freelancers',   description: 'See freelancer list' },
  manage_freelancers:      { label: 'Manage Freelancers',      module: 'freelancers',   description: 'Add, edit, upload freelancers' },
  upload_payroll:          { label: 'Upload Payroll',          module: 'freelancers',   description: 'Upload freelancer payroll files' },
  view_payroll_records:    { label: 'View Payroll Records',    module: 'freelancers',   description: 'View freelancer payroll records' },

  // ── PAYROLL ───────────────────────────────────────────
  view_all_payslips:       { label: 'View All Payslips',       module: 'payroll',       description: 'See payslips of ALL employees (sensitive)' },
  manage_payslips:         { label: 'Manage Payslips',         module: 'payroll',       description: 'Generate and publish payslips' },

  // ── ATTENDANCE ───────────────────────────────────────
  self_attendance:         { label: 'Self Attendance',         module: 'attendance',    description: 'Mark own attendance' },
  manage_attendance:       { label: 'Manage Team Attendance',   module: 'attendance',    description: 'Mark & edit attendance for team' },

  // ── EXPENSES ─────────────────────────────────────────
  submit_expenses:         { label: 'Submit Expenses',         module: 'expenses',      description: 'Submit own expense claims' },
  approve_expenses:        { label: 'Approve Expenses',        module: 'expenses',      description: 'Approve or reject expense claims' },

  // ── PROJECTS ─────────────────────────────────────────
  view_projects:           { label: 'View Projects',           module: 'projects',      description: 'See project list and details' },
  manage_projects:         { label: 'Manage Projects',         module: 'projects',      description: 'Create, edit and assign projects' },
  view_project_analytics:  { label: 'Project Analytics',       module: 'projects',      description: 'View project reports and analytics' },
  manage_task_templates:   { label: 'Task Templates',          module: 'projects',      description: 'Manage reusable project task templates' },

  // ── ASSETS ───────────────────────────────────────────
  manage_assets:           { label: 'Asset Management',        module: 'assets',        description: 'Full asset lifecycle management' },

  // ── RECRUITMENT ──────────────────────────────────────
  view_recruitment:        { label: 'View Recruitment',        module: 'recruitment',   description: 'Access recruitment dashboard & candidates' },
  manage_recruitment:      { label: 'Manage Recruitment',      module: 'recruitment',   description: 'Edit candidates, pipeline, requisitions' },

  // ── COMMUNICATION ────────────────────────────────────
  manage_notifications:    { label: 'Notifications Center',    module: 'communication', description: 'Send and schedule notifications' },
  manage_policies:         { label: 'Manage Policies',         module: 'communication', description: 'Upload and edit company policies' },
  view_policies:           { label: 'View Policies',            module: 'communication', description: 'View company policies' },

  // ── COMPANY FEED ──────────────────────────────────────
  manage_company_feed:     { label: 'Manage Company Feed',     module: 'company_feed',  description: 'Post company updates and announcements' },

  // ── REPORTS ──────────────────────────────────────────
  view_reports:            { label: 'View Reports',            module: 'reports',       description: 'Access reports and analytics dashboards' },

  // ── SYSTEM ───────────────────────────────────────────
  access_settings:         { label: 'App Settings',            module: 'system',        description: 'Configure application settings' },
  access_control:          { label: 'Access Control',          module: 'system',        description: 'Manage user roles & permissions' },
  module_management:       { label: 'Module Management',       module: 'system',        description: 'Enable/disable app modules' },
  view_team:               { label: 'View Team',               module: 'system',        description: 'See team member directory' },
};

// ── DESIGNATION HIERARCHY ───────────────────────────
// Ordered low → high. Permissions cascade upward: level N inherits all from levels 1..N.
// Each permission should be defined at the LOWEST level that should have it.

export const DESIGNATION_HIERARCHY = [
  { name: 'Employee',           level: 1 },
  { name: 'Assistant Manager',  level: 2 },
  { name: 'Team Lead',          level: 3 },
  { name: 'Senior Manager',     level: 4 },
  { name: 'HR Head',            level: 5 },
];

// Returns cascade level (1-5). Unknown designations default to 1.
export function getDesignationLevel(designation) {
  if (!designation) return 1;
  const match = DESIGNATION_HIERARCHY.find(d => d.name.toLowerCase() === designation.toLowerCase());
  return match ? match.level : 1;
}

// Returns role string for nav routing: 'hr', 'manager', 'assistant_manager', 'freelancer', 'employee'
export function getDesignationRole(designation) {
  if (!designation) return 'employee';
  const d = designation.toLowerCase().replace(/\s+/g, '_');
  if (d === 'hr_head' || d === 'hr_manager') return 'hr';
  if (d === 'senior_manager') return 'manager';
  if (d === 'team_lead') return 'employee';
  if (d === 'assistant_manager') return 'assistant_manager';
  if (d === 'proctor') return 'freelancer';
  return 'employee';
}

// Returns dashboard page name for a designation
export function getDesignationDashboard(designation) {
  const role = getDesignationRole(designation);
  if (role === 'hr' || role === 'manager') return 'HRDashboard';
  if (role === 'freelancer') return 'FreelancerDashboard';
  return 'EmployeeDashboard';
}

// ── EFFECTIVE PERMISSIONS (cascade + module overrides) ──

export function getEffectivePermissions(employee, designationPermissions = []) {
  if (!employee) return [];
  if (employee.role === 'admin') return Object.keys(PERMISSIONS);

  // Contractual employees use only fixed module access plus explicit overrides.
  if (employee.employment_type === 'contractual') {
    const fixedPerms = getModuleOverridePermissions(employee.fixed_modules);
    const extraPerms = getModuleOverridePermissions(employee.module_overrides);
    return [...new Set([...fixedPerms, ...extraPerms])];
  }

  // Check if the designation is in the hierarchy
  const hierarchyEntry = DESIGNATION_HIERARCHY.find(d =>
    d.name.toLowerCase() === employee.designation?.toLowerCase()
  );

  if (!hierarchyEntry) {
    // Not in hierarchy (e.g., Proctor/Freelancer) — just return own permissions + overrides
    const userDesig = designationPermissions.find(dp =>
      dp.designation_name?.toLowerCase() === employee.designation?.toLowerCase()
    );
    const ownPerms = userDesig?.permissions || [];
    const overridePerms = getModuleOverridePermissions(employee.module_overrides);
    return [...new Set([...ownPerms, ...overridePerms])];
  }

  // In hierarchy — cascade: collect from all designations at or below user's level
  const userLevel = hierarchyEntry.level;
  const cascaded = designationPermissions
    .filter(dp => {
      const entry = DESIGNATION_HIERARCHY.find(d => d.name.toLowerCase() === dp.designation_name?.toLowerCase());
      return entry && entry.level <= userLevel;
    })
    .flatMap(dp => dp.permissions || []);

  // Add module-level overrides
  const overridePerms = getModuleOverridePermissions(employee.module_overrides);

  return [...new Set([...cascaded, ...overridePerms])];
}

// Get all permission keys for a set of module IDs (for module overrides)
export function getModuleOverridePermissions(moduleOverrides = []) {
  if (!moduleOverrides || moduleOverrides.length === 0) return [];
  return Object.entries(PERMISSIONS)
    .filter(([, val]) => moduleOverrides.includes(val.module))
    .map(([key]) => key);
}

// Get all unique modules from PERMISSIONS config (auto-discovered, keyed by module ID)
export function getPermissionModules() {
  const modules = {};
  Object.entries(PERMISSIONS).forEach(([key, val]) => {
    if (!modules[val.module]) modules[val.module] = [];
    modules[val.module].push({ key, ...val });
  });
  return modules;
}