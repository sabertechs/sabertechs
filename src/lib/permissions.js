/**
 * Central Permission Configuration — ACTION-BASED Designation Access.
 *
 * Way 1 migration: user.data is the SOLE permission source (designation +
 * employment_type). The Employee entity holds HR/business data only and never
 * drives authorization. There are NO per-employee overrides.
 *
 * Permission keys are module.action strings (e.g. "projects.create",
 * "attendance.team.edit", "payroll.freelancer.upload"). Only canonical keys
 * are accepted by authorization.
 *
 * Hierarchy (low → high): Employee → Assistant Manager → Team Lead → Senior Manager → HR Head
 * Permissions cascade upward: a designation at level N inherits all permissions from levels 1..N.
 * Inherited permissions are read-only in the Designation Access UI.
 */

// ── MODULE DEFINITIONS ─────────────────────────────
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
  company_feed:  { name: 'Company Feed',   description: 'Company announcements and social feed' },
};

// ── ACTION-BASED PERMISSION REGISTRY ────────────────
// Each key is "module.action" (or "module.sub.action"). Adding a permission
// here auto-exposes it in Module Management and Designation Access.

export const PERMISSIONS = {
  // ── HR ADMIN ────────────────────────────────────────
  'hr.employees.view':       { label: 'View Employees',        module: 'hr_admin',      description: 'See employee list and profiles' },
  'hr.employees.manage':     { label: 'Manage Employees',      module: 'hr_admin',      description: 'Add, edit, upload employees' },
  'hr.offer_letters':        { label: 'Offer Letters',        module: 'hr_admin',      description: 'Create & manage offer letters' },
  'hr.onboarding':           { label: 'Onboarding',           module: 'hr_admin',      description: 'Employee onboarding checklists' },
  'hr.bg_verification':      { label: 'BG Verification',      module: 'hr_admin',      description: 'Background verification workflow' },
  'hr.api_verification':     { label: 'API Verification',     module: 'hr_admin',      description: 'External API document checks' },
  'hr.bulk_pan':             { label: 'Bulk PAN Verify',       module: 'hr_admin',      description: 'Bulk PAN card verification' },

  // ── FREELANCERS ───────────────────────────────────────
  'freelancers.view':        { label: 'View Freelancers',      module: 'freelancers',   description: 'See freelancer list' },
  'freelancers.manage':      { label: 'Manage Freelancers',    module: 'freelancers',   description: 'Add, edit, upload freelancers' },

  // ── PAYROLL (employee — regular staff) ──────────────────
  'payroll.employee.view':   { label: 'View Employee Payslips', module: 'payroll',     description: 'See payslips of regular employees' },
  'payroll.employee.edit':   { label: 'Manage Employee Payslips', module: 'payroll',   description: 'Generate and publish employee payslips' },

  // ── PAYROLL (freelancer — contractual) ──────────────────
  // Business rule: Freelancer Payroll Upload + Records are ONLY for freelancers.
  // Regular employee payroll is separate (payroll.employee.*). No overlap.
  'payroll.freelancer.upload':   { label: 'Freelancer Payroll Upload', module: 'freelancers', description: 'Upload freelancer payroll files' },
  'payroll.freelancer.records':  { label: 'Freelancer Payroll Records', module: 'freelancers', description: 'View freelancer payroll records' },

  // ── ATTENDANCE ───────────────────────────────────────
  'attendance.self.view':    { label: 'View Own Attendance',   module: 'attendance',    description: 'See own attendance records' },
  'attendance.self.mark':    { label: 'Mark Own Attendance',    module: 'attendance',    description: 'Check in / check out for self' },
  'attendance.team.view':    { label: 'View Team Attendance',   module: 'attendance',    description: 'See attendance for the team' },
  'attendance.team.edit':    { label: 'Edit Team Attendance',   module: 'attendance',    description: 'Mark & edit attendance for team' },

  // ── EXPENSES ─────────────────────────────────────────
  'expenses.self.submit':    { label: 'Submit Expenses',        module: 'expenses',      description: 'Submit own expense claims' },
  'expenses.team.view':      { label: 'View Team Expenses',     module: 'expenses',      description: 'See team expense claims' },
  'expenses.team.approve':   { label: 'Approve Expenses',       module: 'expenses',      description: 'Approve or reject expense claims' },

  // ── PROJECTS ─────────────────────────────────────────
  'projects.view':           { label: 'View Projects',          module: 'projects',      description: 'See project list and details' },
  'projects.create':         { label: 'Create Projects',        module: 'projects',      description: 'Create new projects' },
  'projects.edit':           { label: 'Edit Projects',          module: 'projects',      description: 'Edit and assign projects' },
  'projects.delete':         { label: 'Delete Projects',       module: 'projects',      description: 'Delete projects' },
  'projects.export':         { label: 'Export Projects',        module: 'projects',      description: 'Export projects to Drive' },
  'projects.analytics':      { label: 'Project Analytics',      module: 'projects',      description: 'View project reports and analytics' },
  'projects.task_templates': { label: 'Task Templates',         module: 'projects',      description: 'Manage reusable project task templates' },

  // ── ASSETS ───────────────────────────────────────────
  'assets.view':             { label: 'View Assets',            module: 'assets',        description: 'See asset list and details' },
  'assets.create':           { label: 'Create Assets',          module: 'assets',        description: 'Add new assets' },
  'assets.approve':          { label: 'Approve Asset Requests', module: 'assets',        description: 'Approve asset assignment requests' },
  'assets.manage':           { label: 'Manage Assets',          module: 'assets',        description: 'Full asset lifecycle management' },

  // ── COMMUNICATION ────────────────────────────────────
  'comm.notifications':      { label: 'Notifications Center',   module: 'communication', description: 'Send and schedule notifications' },
  'comm.policies.manage':    { label: 'Manage Policies',        module: 'communication', description: 'Upload and edit company policies' },
  'comm.policies.view':      { label: 'View Policies',          module: 'communication', description: 'View company policies' },

  // ── COMPANY FEED ──────────────────────────────────────
  'feed.manage':             { label: 'Manage Company Feed',    module: 'company_feed',  description: 'Post company updates and announcements' },

  // ── REPORTS ──────────────────────────────────────────
  'reports.view':            { label: 'View Reports',           module: 'reports',       description: 'Access reports and analytics dashboards' },

  // ── SYSTEM ───────────────────────────────────────────
  'system.settings':         { label: 'App Settings',           module: 'system',        description: 'Configure application settings' },
  'system.access_control':   { label: 'Access Control',         module: 'system',        description: 'Manage designation access' },
  'system.module_management': { label: 'Module Management',     module: 'system',        description: 'Enable/disable app modules' },
  'system.team.view':        { label: 'View Team',              module: 'system',        description: 'See team member directory' },
};

// ── DESIGNATION HIERARCHY ───────────────────────────
export const DESIGNATION_HIERARCHY = [
  { name: 'Employee',           level: 1 },
  { name: 'Assistant Manager',  level: 2 },
  { name: 'Team Lead',          level: 3 },
  { name: 'Senior Manager',     level: 4 },
  { name: 'HR Head',            level: 5 },
];

export function getDesignationLevel(designation) {
  if (!designation) return 1;
  const match = DESIGNATION_HIERARCHY.find(d => d.name.toLowerCase() === designation.toLowerCase());
  return match ? match.level : 1;
}

// Way 1: permission source is user.data. Accepts a User object (has .data) or,
// for backward compatibility during migration, an Employee object (has direct
// fields). Reads designation + employment_type from whichever is present.
function readDesignation(obj) {
  return obj?.data?.designation ?? obj?.designation ?? null;
}
function readEmploymentType(obj) {
  return obj?.data?.employment_type ?? obj?.employment_type ?? null;
}

// Every freelancer is contractual. employment_type === 'contractual' => freelancer.
export function isFreelancer(obj) {
  return readEmploymentType(obj) === 'contractual';
}

export function getDesignationDashboard(obj, permissions = []) {
  if (isFreelancer(obj)) return 'FreelancerDashboard';
  if (permissions.includes('hr.employees.view')) return 'HRDashboard';
  const d = readDesignation(obj)?.toLowerCase();
  if (d === 'hr head' || d === 'senior manager') return 'HRDashboard';
  return 'EmployeeDashboard';
}

// ── EFFECTIVE PERMISSIONS (designation cascade, user.data source) ──
// No per-employee overrides. Designation Access cascade only.
export function getEffectivePermissions(obj, designationPermissions = []) {
  const designation = readDesignation(obj);
  if (!designation) return [];

  let perms;
  const hierarchyEntry = DESIGNATION_HIERARCHY.find(d =>
    d.name.toLowerCase() === designation.toLowerCase()
  );

  if (!hierarchyEntry) {
    // Not in hierarchy (e.g., Proctor) — own permissions only, no inheritance
    const userDesig = designationPermissions.find(dp =>
      dp.designation_name?.toLowerCase() === designation.toLowerCase()
    );
    perms = [...(userDesig?.permissions || [])];
  } else {
    // Cascade: collect from all designations at or below the user's level
    const userLevel = hierarchyEntry.level;
    perms = designationPermissions
      .filter(dp => {
        const entry = DESIGNATION_HIERARCHY.find(d => d.name.toLowerCase() === dp.designation_name?.toLowerCase());
        return entry && entry.level <= userLevel;
      })
      .flatMap(dp => dp.permissions || []);
  }

  return [...new Set(perms)];
}

// Resolve only canonical module.action permission keys. Legacy aliases are
// retained only as migration metadata and are never accepted by authorization.
export function resolveCan(effectivePerms, permissionKey) {
  if (permissionKey == null) return false;
  return effectivePerms.includes(permissionKey);
}

// Get inherited permissions for a designation from all lower cascade levels.
// Returns array of { key, fromDesignation } for the Designation Access UI to
// display as read-only (inherited permissions cannot be edited).
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
// Maps page names → required permission(s). Direct URL entry is denied unless
// can() passes. An array means ANY listed permission grants access. Uses new
// module.action keys; the legacy alias bridge keeps unmigrated entries working.
export const PAGE_PERMISSIONS = {
  // HR Admin
  Employees: 'hr.employees.view',
  AddEmployee: 'hr.employees.manage',
  EmployeeUpload: 'hr.employees.manage',
  OfferLetterManagement: 'hr.offer_letters',
  OnboardingTemplates: 'hr.onboarding',
  BackgroundVerification: 'hr.bg_verification',
  APIModule: 'hr.api_verification',
  BulkPANVerification: 'hr.bulk_pan',
  // Freelancers
  Freelancers: 'freelancers.view',
  FreelancerUpload: 'freelancers.manage',
  FreelancerPayrollUpload: 'payroll.freelancer.upload',
  AdminPayrollView: 'payroll.freelancer.records',
  // Payroll (employee)
  PayslipManagement: ['payroll.employee.view', 'payroll.employee.edit'],
  // Attendance
  AttendanceManagement: ['attendance.team.view', 'attendance.team.edit'],
  MyAttendance: ['attendance.self.view', 'attendance.self.mark'],
  // Expenses
  ExpenseApproval: 'expenses.team.approve',
  MyExpenses: 'expenses.self.submit',
  // Projects
  ProjectManagement: 'projects.view',
  ProjectDetails: 'projects.view',
  ProjectAnalytics: 'projects.analytics',
  TaskTemplates: 'projects.task_templates',
  FreelancerProjects: 'projects.view',
  // Assets
  AssetDashboard: 'assets.manage',
  AssetList: 'assets.manage',
  AssetMaintenance: 'assets.manage',
  AssetReports: 'assets.manage',
  // Communication
  PolicyManagement: 'comm.policies.manage',
  NotificationCenter: 'comm.notifications',
  CompanyPolicies: 'comm.policies.view',
  // Reports
  Reports: 'reports.view',
  // System
  Settings: 'system.settings',
  DesignationPermissions: 'system.access_control',
  AccessControl: 'system.access_control',
  ModuleManagement: 'system.module_management',
  TeamView: 'system.team.view',
  TestEmail: 'system.access_control',
  PushNotificationTest: 'system.access_control',
};