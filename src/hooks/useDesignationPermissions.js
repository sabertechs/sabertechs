import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useEffect, useRef } from 'react';

let hasSeeded = false;

// ── SEED DATA ──────────────────────────────────────
// Each designation stores ONLY its level-specific permissions.
// The cascade in getEffectivePermissions automatically inherits from lower levels at runtime.
// Hierarchy: Employee(1) → Assistant Manager(2) → Team Lead(3) → Senior Manager(4) → HR Head(5)

const SEED_DESIGNATIONS = [
  {
    designation_name: 'Employee',
    permissions: ['self_attendance', 'submit_expenses', 'view_team', 'view_policies'],
    is_system: true,
    display_order: 1,
  },
  {
    designation_name: 'Assistant Manager',
    permissions: ['view_employees', 'view_freelancers', 'view_projects', 'view_payroll_records'],
    is_system: true,
    display_order: 2,
  },
  {
    designation_name: 'Team Lead',
    permissions: ['manage_freelancers', 'manage_projects', 'manage_task_templates', 'view_project_analytics'],
    is_system: true,
    display_order: 3,
  },
  {
    designation_name: 'Senior Manager',
    permissions: [
      'manage_employees', 'view_offer_letters', 'manage_onboarding',
      'bg_verification', 'api_verification', 'bulk_pan_verify',
      'upload_payroll', 'view_all_payslips', 'manage_payslips',
      'manage_attendance', 'approve_expenses',
      'view_recruitment', 'manage_recruitment',
      'manage_notifications', 'view_reports',
    ],
    is_system: true,
    display_order: 4,
  },
  {
    designation_name: 'HR Head',
    permissions: [
      'manage_policies', 'manage_company_feed',
      'access_settings', 'access_control', 'module_management',
      'manage_assets',
    ],
    is_system: true,
    display_order: 5,
  },
  {
    designation_name: 'Proctor',
    permissions: ['view_projects'],
    is_system: true,
    display_order: 6,
  },
];

/**
 * Fetches all DesignationPermission rows (cached) and seeds defaults on first load if empty.
 * Used by Layout, usePermissions, and the DesignationPermissions page.
 */
export function useDesignationPermissions() {
  const queryClient = useQueryClient();
  const { data: designations = [], isLoading } = useQuery({
    queryKey: ['designation-permissions'],
    queryFn: () => base44.entities.DesignationPermission.list('display_order'),
    staleTime: 10 * 60 * 1000,
  });

  const seedingRef = useRef(false);

  useEffect(() => {
    if (!isLoading && !seedingRef.current && !hasSeeded) {
      seedingRef.current = true;
      hasSeeded = true;
      // Idempotent seed: only create designations that don't already exist (case-insensitive)
      const existingNames = new Set(designations.map(d => d.designation_name?.toLowerCase()));
      const missing = SEED_DESIGNATIONS.filter(s => !existingNames.has(s.designation_name.toLowerCase()));
      if (missing.length > 0) {
        base44.entities.DesignationPermission.bulkCreate(missing)
          .then(() => queryClient.invalidateQueries(['designation-permissions']))
          .catch(() => { seedingRef.current = false; hasSeeded = false; });
      }
    }
  }, [isLoading, designations.length, queryClient]);

  return { designations, isLoading };
}