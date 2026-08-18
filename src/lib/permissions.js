/**
 * Central Permission Configuration — Designation Access is the single source of truth.
 *
 * Hierarchy (low → high): Employee → Assistant Manager → Team Lead → Senior Manager → HR Head
 * Permissions cascade upward: a designation at level N inherits all permissions from levels 1..N.
 * Designation Access is the baseline; per-employee extra_permissions (set via Access Control)
 * are merged on top of the cascade as an individual override.
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

  // ── COMMUNICATION ────────────────────────────────────
  manage_notifications:    { label: 'Notifications Center',    module: 'communication', description: 'Send and schedule notifications' },
  manage_policies:         { label: 'Manage Policies',         module: 'communication', description: 'Upload and edit company policies' },
  view_policies:           { label: 'View Policies',            module: 'communication', description: 'View company policies' },

  // ── COMPANY FEED ──────────────────────────────────────
  manage_company_feed:     { label: 'Manage Company Feed',     module: 'company_feed',  description: 'Post company updates and announcements' },

  // ── GAMES ───────────────────────────────────────────────
  manage_games:            { label: 'Manage Games',            module: 'games',         description: 'Configure game settings and tokens' },

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

// Freelancers are contractual employees (employment_type === 'contractual').
// Designation alone does not determine freelancer status — employment_type does.
export function isFreelancer(employee) {
  return employee?.employment_type === 'contractual';
}

// Fixed permissions always granted to freelancers (contractual employees),
// independent of Designation Access — ensures freelancers can always see
// the modules they need to work (their assigned projects).
export const FREELANCER_FIXED_PERMISSIONS = ['view_projects'];

// Returns dashboard page name for an employee + their effective permissions.
// Decision is designation/permission based — no legacy role strings.
export function getDesignationDashboard(employee, permissions = []) {
  if (isFreelancer(employee)) return 'FreelancerDashboard';
  if (permissions.includes('view_employees')) return 'HRDashboard';
  // Fallback by designation when permissions aren't loaded yet
  const d = employee?.designation?.toLowerCase();
  if (d === 'hr head' || d === 'senior manager') return 'HRDashboard';
  return 'EmployeeDashboard';
}

// ── EFFECTIVE PERMISSIONS (designation cascade) ──

export function getEffectivePermissions(employee, designationPermissions = []) {
  if (!employee) return [];

  let perms;

  // Check if the designation is in the hierarchy
  const hierarchyEntry = DESIGNATION_HIERARCHY.find(d =>
    d.name.toLowerCase() === employee.designation?.toLowerCase()
  );

  if (!hierarchyEntry) {
    // Not in hierarchy (e.g., Proctor/Freelancer) — just return own permissions
    const userDesig = designationPermissions.find(dp =>
      dp.designation_name?.toLowerCase() === employee.designation?.toLowerCase()
    );
    perms = [...(userDesig?.permissions || [])];
  } else {
    // In hierarchy — cascade: collect from all designations at or below user's level
    const userLevel = hierarchyEntry.level;
    perms = designationPermissions
      .filter(dp => {
        const entry = DESIGNATION_HIERARCHY.find(d => d.name.toLowerCase() === dp.designation_name?.toLowerCase());
        return entry && entry.level <= userLevel;
      })
      .flatMap(dp => dp.permissions || []);
  }

  // Contractual employees (freelancers) always get their fixed modules
  if (isFreelancer(employee)) {
    perms = [...perms, ...FREELANCER_FIXED_PERMISSIONS];
  }

  // Per-employee individual overrides (set via Access Control) merge on top
  const extraPerms = Array.isArray(employee.extra_permissions) ? employee.extra_permissions : [];
  perms = [...perms, ...extraPerms];

  return [...new Set(perms)];
}

// Get inherited permissions for a designation from all lower cascade levels.
// Returns array of { key, fromDesignation } for the Designation Access UI to display as read-only.
export function getInheritedPermissions(designationName, designationPermissions = []) {
  const hierarchyEntry = DESIGNATION_HIERARCHY.find(d =>
    d.name.toLowerCase() === designationName?.toLowerCase()
  );
  if (!hierarchyEntry) return [];

  const userLevel = hierarchyEntry.level;
  const inherited = [];
  const seen = new Set();

  designationPermissions.forEach(dp => {
    const entry = DESIGNATION_HIERARCHY.find(d => d.name.toLowerCase() === dp.designation_name?.toLowerCase());
    if (entry && entry.level < userLevel) {
      (dp.permissions || []).forEach(permKey => {
        if (!seen.has(permKey)) {
          seen.add(permKey);
          inherited.push({ key: permKey, fromDesignation: dp.designation_name });
        }
      });
    }
  });

  return inherited;
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

// ── ROUTE PROTECTION MAP ────────────────────────────
// Maps page names to the permission(s) required to access them directly by URL.
// Pages not listed are accessible to all authenticated users (dashboards,
// self-service, and dual-purpose pages where the management action is gated
// in-page via can()). Uses the same central resolver as the sidebar, so items
// hidden in the sidebar are not reachable by URL. An array means ANY listed
// permission grants access.
export const PAGE_PERMISSIONS = {
  // HR Admin
  Employees: 'view_employees',
  AddEmployee: 'manage_employees',
  EmployeeUpload: 'manage_employees',
  OfferLetterManagement: 'view_offer_letters',
  OnboardingTemplates: 'manage_onboarding',
  BackgroundVerification: 'bg_verification',
  APIModule: 'api_verification',
  BulkPANVerification: 'bulk_pan_verify',
  // Freelancers
  Freelancers: 'view_freelancers',
  FreelancerUpload: 'manage_freelancers',
  FreelancerPayrollUpload: 'upload_payroll',
  AdminPayrollView: 'view_payroll_records',
  // Payroll
  PayslipManagement: ['view_all_payslips', 'manage_payslips'],
  // Attendance
  AttendanceManagement: 'manage_attendance',
  MyAttendance: 'self_attendance',
  // Expenses
  ExpenseApproval: 'approve_expenses',
  MyExpenses: 'submit_expenses',
  // Projects
  ProjectManagement: 'view_projects',
  ProjectDetails: 'view_projects',
  ProjectAnalytics: 'view_project_analytics',
  TaskTemplates: 'manage_task_templates',
  FreelancerProjects: 'view_projects',
  // Assets
  AssetDashboard: 'manage_assets',
  AssetList: 'manage_assets',
  AssetMaintenance: 'manage_assets',
  AssetReports: 'manage_assets',
  // Communication
  PolicyManagement: 'manage_policies',
  NotificationCenter: 'manage_notifications',
  CompanyPolicies: 'view_policies',
  // Reports
  Reports: 'view_reports',
  // System
  Settings: 'access_settings',
  DesignationPermissions: 'access_control',
  AccessControl: 'access_control',
  ModuleManagement: 'module_management',
  TeamView: 'view_team',
  TestEmail: 'access_control',
  PushNotificationTest: 'access_control',
};