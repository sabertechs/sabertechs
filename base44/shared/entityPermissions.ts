/**
 * Centralized entity-action → permission-key map for backend authorization.
 *
 * Way 1: user.data.designation → Designation Access → can(permissionKey).
 * This map is the SINGLE source of truth for which permission key is required
 * to perform a given CRUD action on a given entity. The generic `manageRecord`
 * backend function reads this map to authorize every mutation.
 *
 * RLS remains the data-SCOPE safety layer (which records a user can access);
 * this map answers the PERMISSION question (which actions a user can perform).
 *
 * `null` = any authenticated user may perform this action (self-service).
 */

export interface ActionPerm {
  create?: string | null;
  update?: string | null;
  delete?: string | null;
}

// ── Standard (admin/manager) permissions ──────────────────
export const ENTITY_PERMISSIONS: Record<string, ActionPerm> = {
  // HR Admin
  Employee:           { create: 'hr.employees.manage', update: 'hr.employees.manage', delete: 'hr.employees.manage' },
  OfferLetter:         { create: 'hr.offer_letters',     update: 'hr.offer_letters',     delete: 'hr.offer_letters' },
  OnboardingTemplate:  { create: 'hr.onboarding',        update: 'hr.onboarding',        delete: 'hr.onboarding' },
  OnboardingChecklist: { create: 'hr.onboarding',        update: 'hr.onboarding',        delete: 'hr.onboarding' },

  // Attendance (team / supervisor)
  Attendance:          { create: 'attendance.team.edit', update: 'attendance.team.edit', delete: 'attendance.team.edit' },
  Holiday:             { create: 'attendance.team.edit', update: 'attendance.team.edit', delete: 'attendance.team.edit' },

  // Payroll (employee)
  Payslip:             { create: 'payroll.employee.edit', update: 'payroll.employee.edit', delete: 'payroll.employee.edit' },

  // Expenses (team / approve)
  Expense:             { create: 'expenses.team.approve', update: 'expenses.team.approve', delete: 'expenses.team.approve' },

  // Projects
  Project:             { create: 'projects.create',  update: 'projects.edit',   delete: 'projects.delete' },
  ProjectTask:         { create: 'projects.edit',    update: 'projects.edit',   delete: 'projects.edit' },
  ProjectGroup:        { create: 'projects.edit',    update: 'projects.edit',   delete: 'projects.edit' },
  ProjectApplication:  { create: 'projects.edit',    update: 'projects.edit',   delete: 'projects.edit' },
  TaskTemplate:        { create: 'projects.task_templates', update: 'projects.task_templates', delete: 'projects.task_templates' },

  // Assets
  Asset:               { create: 'assets.manage', update: 'assets.manage', delete: 'assets.manage' },
  AssetAssignment:     { create: 'assets.manage', update: 'assets.manage', delete: 'assets.manage' },
  AssetRequest:        { create: 'assets.approve', update: 'assets.approve', delete: 'assets.manage' },
  MaintenanceLog:      { create: 'assets.manage', update: 'assets.manage', delete: 'assets.manage' },

  // Communication
  CompanyPost:         { create: 'feed.manage',          update: 'feed.manage',          delete: 'feed.manage' },
  PostComment:         { create: null,                    update: null,                   delete: 'feed.manage' },
  CompanyPolicy:       { create: 'comm.policies.manage', update: 'comm.policies.manage', delete: 'comm.policies.manage' },
  Notification:        { create: 'comm.notifications',   update: 'comm.notifications',   delete: 'comm.notifications' },
  ScheduledNotification: { create: 'comm.notifications', update: 'comm.notifications',   delete: 'comm.notifications' },

  // System
  DesignationPermission: { create: 'system.access_control', update: 'system.access_control', delete: 'system.access_control' },
  AppSettings:           { create: 'system.settings',        update: 'system.settings',        delete: 'system.settings' },

  // HR verification
  APIVerification:      { create: 'hr.api_verification', update: 'hr.api_verification', delete: 'hr.api_verification' },
  BulkPANVerification:  { create: 'hr.bulk_pan',         update: 'hr.bulk_pan',         delete: 'hr.bulk_pan' },

  // Freelancer payroll
  FreelancerPayroll:     { create: 'payroll.freelancer.upload', update: 'payroll.freelancer.records', delete: 'payroll.freelancer.records' },
};

// ── Self-service permissions (context='self') ─────────────
// When the frontend passes context='self', these permissions replace the
// standard ones. null = any authenticated user (ownership verified separately).
export const SELF_ENTITY_PERMISSIONS: Record<string, ActionPerm> = {
  Attendance:          { create: 'attendance.self.mark', update: 'attendance.self.mark' },
  Expense:             { create: 'expenses.self.submit', update: 'expenses.self.submit' },
  Employee:            { update: null }, // self-registration / profile update
  OnboardingChecklist: { update: null }, // employee completes own checklist
  Notification:        { update: null, delete: null }, // mark own as read / delete own
  ProjectApplication:  { create: null }, // freelancer applies
  AssetRequest:        { create: null }, // any user requests asset
  PostComment:         { create: null }, // any user comments
};

// ── Ownership field for self-service verification ─────────
// When context='self', the backend verifies that the record's owner field
// matches the current user's email.
export const SELF_OWNERSHIP_FIELD: Record<string, string> = {
  Attendance: 'employee_email',
  Expense: 'employee_email',
  Employee: 'email',
  OnboardingChecklist: 'employee_email',
  Notification: 'recipient_email',
  ProjectApplication: 'freelancer_email',
  AssetRequest: 'employee_email',
  PostComment: 'employee_email',
};

export function getPermission(entity: string, action: string, context?: string): string | null | undefined {
  const map = context === 'self' && SELF_ENTITY_PERMISSIONS[entity]
    ? SELF_ENTITY_PERMISSIONS[entity]
    : ENTITY_PERMISSIONS[entity];
  if (!map) return undefined;
  return map[action as keyof ActionPerm];
}

export function getOwnershipField(entity: string): string | undefined {
  return SELF_OWNERSHIP_FIELD[entity];
}