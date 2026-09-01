import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { bulkCreateEntities } from '@/lib/entityMutations';
import { useEffect, useRef } from 'react';

let hasSeeded = false;

// ── SEED DATA (action-based module.action keys) ─────────
// Each designation stores ONLY its level-specific permissions. The cascade in
// getEffectivePermissions inherits from lower levels at runtime.
// Hierarchy: Employee(1) → Assistant Manager(2) → Team Lead(3) → Senior Manager(4) → HR Head(5)
// Business rule: every freelancer is contractual; freelancer payroll upload/records
// are separate from regular employee payroll. Recruitment/Pipeline removed.

const SEED_DESIGNATIONS = [
  {
    designation_name: 'Employee',
    permissions: ['attendance.self.view', 'attendance.self.mark', 'expenses.self.submit', 'system.team.view', 'comm.policies.view'],
    is_system: true,
    display_order: 1,
  },
  {
    designation_name: 'Assistant Manager',
    permissions: ['hr.employees.view', 'freelancers.view', 'projects.view', 'payroll.freelancer.records'],
    is_system: true,
    display_order: 2,
  },
  {
    designation_name: 'Team Lead',
    permissions: ['freelancers.manage', 'projects.create', 'projects.edit', 'projects.delete', 'projects.task_templates', 'projects.analytics'],
    is_system: true,
    display_order: 3,
  },
  {
    designation_name: 'Senior Manager',
    permissions: [
      'hr.employees.manage', 'hr.offer_letters', 'hr.onboarding',
      'hr.bg_verification', 'hr.api_verification', 'hr.bulk_pan',
      'payroll.freelancer.upload', 'payroll.employee.view', 'payroll.employee.edit',
      'attendance.team.view', 'attendance.team.edit',
      'expenses.team.approve',
      'comm.notifications', 'reports.view',
    ],
    is_system: true,
    display_order: 4,
  },
  {
    designation_name: 'HR Head',
    permissions: [
      'comm.policies.manage', 'feed.manage',
      'system.settings', 'system.access_control', 'system.module_management',
      'assets.manage', 'assets.view', 'assets.create', 'assets.approve',
    ],
    is_system: true,
    display_order: 5,
  },
  {
    designation_name: 'Proctor',
    permissions: ['projects.view'],
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
        bulkCreateEntities('DesignationPermission', missing)
          .then(() => queryClient.invalidateQueries(['designation-permissions']))
          .catch(() => { seedingRef.current = false; hasSeeded = false; });
      }
    }
  }, [isLoading, designations.length, queryClient]);

  return { designations, isLoading };
}